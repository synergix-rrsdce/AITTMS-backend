
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = process.env.PORT || 4001;

// Configure CORS for production with Vercel frontend and Render backend
const corsOptions = {
  origin: [
    'http://localhost:3000', // Local development
    'http://localhost:5173', // Vite local development
    'https://your-frontend-app.vercel.app', // Replace with your actual Vercel URL
    /https:\/\/.*\.vercel\.app$/, // Allow all Vercel subdomains
    /https:\/\/.*\.onrender\.com$/ // Allow all Render subdomains
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// --- Background interval for updating trains arriving in next 30 minutes ---
const UPDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
function updateUpcomingTrains() {
  const todayDbPath = require('path').join(__dirname, '../../AITTMS-database/database/today.db');
  const sqlite3 = require('sqlite3').verbose();
  const todayDb = new sqlite3.Database(todayDbPath);
  todayDb.all('SELECT rowid, train_number, train_name, exp_arrival FROM allocations', async (err, rows) => {
    if (err) {
      todayDb.close();
      return;
    }
    const { spawn } = require('child_process');
    const path = require('path');
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    function timeToMinutes(timeStr) {
      if (!timeStr || timeStr === 'TBD') return null;
      const [h, m] = timeStr.split(":").map(Number);
      if (isNaN(h) || isNaN(m)) return null;
      return h * 60 + m;
    }
    // Only fetch for trains whose exp_arrival is within the next 30 minutes
    const filteredRows = rows.filter(row => {
      const schedMin = timeToMinutes(row.exp_arrival);
      return schedMin !== null && schedMin > nowMinutes && schedMin <= nowMinutes + 30;
    });
    await Promise.all(filteredRows.map(row => {
      return new Promise((resolve) => {
        const formattedName = (row.train_name || '').toLowerCase().replace(/\s+/g, '-');
        const inputStr = `${formattedName}-${row.train_number}`;
        const pyPath = path.join(__dirname, '..', 'py', 'real_time.py');
        const pyProcess = spawn('python', [pyPath, inputStr]);
        let dataString = '';
        pyProcess.stdout.on('data', (chunk) => {
          dataString += chunk.toString();
        });
        pyProcess.on('close', () => {
          let selected = {};
          try {
            const parsed = JSON.parse(dataString.replace(/'/g, '"'));
            selected = {
              real_arrival: parsed.real_arrival,
              delay: parsed.delay
            };
          } catch (e) {
            selected = { error: 'parse_error', raw: dataString };
          }
          todayDb.run('UPDATE allocations SET real_arrival = ?, delay = ? WHERE rowid = ?', [selected.real_arrival || null, selected.delay || null, row.rowid], (err2) => {
            resolve();
          });
        });
      });
    }));
    todayDb.close();
  });
}
setInterval(updateUpcomingTrains, UPDATE_INTERVAL_MS);





// Health check endpoint for both databases
app.get('/api/db-health', (req, res) => {
  const mainDbPath = path.join(__dirname, '../../AITTMS-database/database/train_allocations.db');
  const todayDbPath = path.join(__dirname, '../../AITTMS-database/database/today.db');
  const sqlite3 = require('sqlite3').verbose();
  let mainDbStatus = 'ok';
  let todayDbStatus = 'ok';
  const mainDb = new sqlite3.Database(mainDbPath, (err) => {
    if (err) mainDbStatus = err.message;
    mainDb.get('SELECT 1 FROM allocations LIMIT 1', (err2) => {
      if (err2) mainDbStatus = err2.message;
      mainDb.close();
      const todayDb = new sqlite3.Database(todayDbPath, (err3) => {
        if (err3) todayDbStatus = err3.message;
        todayDb.get('SELECT 1 FROM allocations LIMIT 1', (err4) => {
          if (err4) todayDbStatus = err4.message;
          todayDb.close();
          res.json({
            train_allocations_db: mainDbStatus,
            today_db: todayDbStatus
          });
        });
      });
    });
  });
});

// Endpoint to count all rows in today.db allocations table
app.get('/api/active', (req, res) => {
  const todayDbPath = require('path').join(__dirname, '../../AITTMS-database/database/today.db');
  const sqlite3 = require('sqlite3').verbose();
  const todayDb = new sqlite3.Database(todayDbPath);
  todayDb.get('SELECT COUNT(*) as count FROM allocations', (err, row) => {
    todayDb.close();
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ count: row.count });
  });
});

// Variable to store current real time in 24-hour format (HH:mm)
let currentRealTime = () => {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};


// Function to get present day as a string (e.g., 'Sunday')
function getPresentDay() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[new Date().getDay()];
}
let todayValue = null;

// Update the value periodically or on server start
function updateTodayValue() {
  todayValue = getPresentDay();
}
updateTodayValue();

// Use persistent SQLite DB in database folder
const path = require('path');
const dbPath = path.join(__dirname, '../../AITTMS-database/database/train_allocations.db');
const db = new sqlite3.Database(dbPath);
db.serialize(() => {
  // Optional: Only insert sample data if table is empty
  db.get('SELECT * FROM allocations WHERE days = ?', [todayValue]);
});

// Function to create/overwrite today.db for the current day
const fs = require('fs');

function safeUnlinkSync(filePath, maxRetries = 5, delay = 200) {
  let tries = 0;
  while (fs.existsSync(filePath) && tries < maxRetries) {
    try {
      fs.unlinkSync(filePath);
      return true;
    } catch (err) {
      if (err.code === 'EBUSY' || err.code === 'EPERM') {
        // Wait and retry
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
        tries++;
      } else {
        throw err;
      }
    }
  }
  return !fs.existsSync(filePath);
}

function createTodayDb(callback) {
  const todayDbPath = path.join(__dirname, '../../AITTMS-database/database/today.db');
  // Try to close any open connection by opening and closing
  if (fs.existsSync(todayDbPath)) {
    try {
      const tempDb = new sqlite3.Database(todayDbPath);
      tempDb.close();
    } catch (e) {}
    safeUnlinkSync(todayDbPath);
  }
  const todayDb = new sqlite3.Database(todayDbPath);
  todayDb.serialize(() => {
    // Attach the main database
    todayDb.run(`ATTACH DATABASE ? AS mainDb`, [path.join(__dirname, '../../AITTMS-database/database/train_allocations.db')], (err1) => {
      if (err1) {
        todayDb.close();
        if (callback) callback(err1);
        return;
      }
      // Create the allocations table structure
      todayDb.run(`CREATE TABLE allocations AS SELECT * FROM mainDb.allocations WHERE days = ?`, [todayValue], (err2) => {
        todayDb.close();
        if (callback) callback(err2);
      });
    });
  });
}

// Track last day for which today.db was created
let lastTodayDbDay = todayValue;
function checkAndUpdateTodayDbIfNeeded() {
  const currentDay = getPresentDay();
  if (currentDay !== lastTodayDbDay) {
    todayValue = currentDay;
    lastTodayDbDay = currentDay;
    createTodayDb();
  }
}

// Create today.db at server start
createTodayDb();

// API endpoint to get present day info (and update today.db if day changed)
app.get('/api/today', (req, res) => {
  checkAndUpdateTodayDbIfNeeded();
  const todayDbPath = require('path').join(__dirname, '../../AITTMS-database/database/today.db');
  const sqlite3 = require('sqlite3').verbose();
  const todayDb = new sqlite3.Database(todayDbPath);
  todayDb.all('SELECT * FROM allocations', (err, rows) => {
    todayDb.close();
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ day: todayValue, rows });
  });
});

// API endpoint to get all train data
app.get('/api/trains', (req, res) => {
  const todayDbPath = require('path').join(__dirname, '../../AITTMS-database/database/today.db');
  const sqlite3 = require('sqlite3').verbose();
  const todayDb = new sqlite3.Database(todayDbPath);
  todayDb.all('SELECT * FROM allocations', (err, rows) => {
    todayDb.close();
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    // Get current time in minutes since midnight
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    // Helper to convert HH:mm string to minutes since midnight
    function timeToMinutes(timeStr) {
      if (!timeStr || timeStr === 'TBD') return null;
      const [h, m] = timeStr.split(":").map(Number);
      if (isNaN(h) || isNaN(m)) return null;
      return h * 60 + m;
    }
    // Filter trains within ±2 hours (120 minutes) of now
    const trains = rows
      .map(row => ({
        id: row.train_number?.toString() || row.id?.toString() || '',
        name: row.train_name,
        type: row.type || "Express",
        from: row.from_station || "",
        to: row.to_station || "",
        scheduled: row.arrives || "",
        estimated: row.estimated || "",
        status: row.status || "On Time",
        platform: row.allocated_platform || "-",
        passengers: row.passengers || 0,
        priority: row.priority || "-"
      }))
      .filter(train => {
        const schedMin = timeToMinutes(train.scheduled);
        return schedMin !== null && Math.abs(schedMin - nowMinutes) <= 120;
      });
    res.json({ trains });
  });
});


// Endpoint to fetch and update real-time train data for each row (parallel, today.db, only delay/real_arrival)
app.post('/api/update-realtime', async (req, res) => {
  const todayDbPath = require('path').join(__dirname, '../database/today.db');
  const sqlite3 = require('sqlite3').verbose();
  const todayDb = new sqlite3.Database(todayDbPath);
  todayDb.all('SELECT rowid, train_number, train_name, exp_arrival FROM allocations', async (err, rows) => {
    if (err) {
      todayDb.close();
      return res.status(500).json({ error: 'Database error' });
    }
    const { spawn } = require('child_process');
    const path = require('path');
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    function timeToMinutes(timeStr) {
      if (!timeStr || timeStr === 'TBD') return null;
      const [h, m] = timeStr.split(":").map(Number);
      if (isNaN(h) || isNaN(m)) return null;
      return h * 60 + m;
    }
    // Only fetch for trains up to now
    const filteredRows = rows.filter(row => {
      const schedMin = timeToMinutes(row.exp_arrival);
      return schedMin !== null && schedMin <= nowMinutes;
    });
    // Run all fetches in parallel
    await Promise.all(filteredRows.map(row => {
      return new Promise((resolve) => {
        const formattedName = (row.train_name || '').toLowerCase().replace(/\s+/g, '-');
        const inputStr = `${formattedName}-${row.train_number}`;
        const pyPath = path.join(__dirname, '..', 'py', 'real_time.py');
        const pyProcess = spawn('python', [pyPath, inputStr]);
        let dataString = '';
        pyProcess.stdout.on('data', (chunk) => {
          dataString += chunk.toString();
        });
        pyProcess.on('close', () => {
          // Debug: log the raw output from Python
          console.log('Python output for', inputStr, ':', dataString);
          // Parse output and extract only real_arrival and delay
          let selected = {};
          try {
            const parsed = JSON.parse(dataString.replace(/'/g, '"'));
            selected = {
              real_arrival: parsed.real_arrival,
              delay: parsed.delay
            };
          } catch (e) {
            console.error('Parse error for', inputStr, ':', e.message, '| Raw:', dataString);
            selected = { error: 'parse_error', raw: dataString };
          }
          todayDb.run('UPDATE allocations SET real_arrival = ?, delay = ? WHERE rowid = ?', [selected.real_arrival || null, selected.delay || null, row.rowid], (err2) => {
            resolve();
          });
        });
      });
    }));
    todayDb.close();
    res.json({ updated: filteredRows.length });
  });
});

app.get('/api/allocations/real-time', (req, res) => {
  db.all('SELECT train_number, train_name, real_arrival, delay FROM allocations', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ data: rows });
  });
});

// Endpoint to fetch weather data from Python script, with 30 min cache
const { spawn } = require('child_process');
let cachedWeather = null;
let lastWeatherFetch = 0;
const WEATHER_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in ms

function fetchWeatherFromPython(callback) {
  const pyProcess = spawn('python', [
    path.join(__dirname, '..', 'py', 'scrape_weather.py')
  ]);
  let dataString = '';
  pyProcess.stdout.on('data', (data) => {
    dataString += data.toString();
  });
  pyProcess.stderr.on('data', (data) => {
    console.error('Python error:', data.toString());
  });
  pyProcess.on('close', (code) => {
    try {
      const weather = JSON.parse(dataString.replace(/'/g, '"'));
      cachedWeather = weather;
      lastWeatherFetch = Date.now();
      callback(null, weather);
    } catch (e) {
      callback(e, null);
    }
  });
}

app.get('/api/weather', (req, res) => {
  const now = Date.now();
  if (cachedWeather && (now - lastWeatherFetch) < WEATHER_CACHE_DURATION) {
    return res.json(cachedWeather);
  }
  fetchWeatherFromPython((err, weather) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch or parse weather data' });
    }
    res.json(weather);
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AI Train Traffic Management System API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      'GET /': 'API Information',
      'GET /api/db-health': 'Database health check',
      'GET /api/active': 'Count active trains',
      'GET /api/today': 'Get today\'s train allocations',
      'GET /api/trains': 'Get all train data',
      'POST /api/update-realtime': 'Update real-time train data',
      'GET /api/allocations/real-time': 'Get real-time allocations',
      'GET /api/weather': 'Get current weather data'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
