const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 4001;

// Middleware
app.use(cors());
app.use(express.json());

// Database paths
const mainDbPath = path.join(__dirname, '../database/train_allocations.db');
const todayDbPath = path.join(__dirname, '../database/today.db');

// Current day helper
function getCurrentDay() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[new Date().getDay()];
}

// Time conversion helper
function timeToMinutes(timeStr) {
  if (!timeStr || timeStr === 'TBD') return null;
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// Initialize today.db on server start
function initializeTodayDb() {
  const currentDay = getCurrentDay();
  const todayDb = new sqlite3.Database(todayDbPath);
  
  todayDb.serialize(() => {
    todayDb.run(`ATTACH DATABASE ? AS mainDb`, [mainDbPath], (err) => {
      if (err) {
        console.error('Error attaching main database:', err);
        return;
      }
      
      // Drop existing table and recreate with fresh data for today
      todayDb.run(`DROP TABLE IF EXISTS allocations`);
      todayDb.run(`CREATE TABLE allocations AS SELECT * FROM mainDb.allocations WHERE days = ?`, [currentDay], (err) => {
        if (err) {
          console.error('Error creating today table:', err);
        } else {
          console.log(`✅ Today's database initialized for ${currentDay}`);
        }
        todayDb.close();
      });
    });
  });
}

// API Endpoints

// Get active train count
app.get('/api/active', (req, res) => {
  const todayDb = new sqlite3.Database(todayDbPath);
  todayDb.get('SELECT COUNT(*) as count FROM allocations', (err, row) => {
    todayDb.close();
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ count: row.count });
  });
});

// Get all trains with real-time data
app.get('/api/trains', (req, res) => {
  const todayDb = new sqlite3.Database(todayDbPath);
  todayDb.all('SELECT * FROM allocations', (err, rows) => {
    todayDb.close();
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Transform and filter trains
    const trains = rows
      .map(row => ({
        id: row.train_number?.toString() || '',
        name: row.train_name || "Unknown Train",
        type: row.type || "Express",
        from: row.from_station || "",
        to: row.to_station || "",
        scheduled: row.exp_arrival || "",
        estimated: row.real_arrival || row.exp_arrival || "",
        status: row.delay && row.delay.includes("Delayed") ? row.delay : "On Time",
        platform: row.allocated_platform || "-",
        passengers: row.passengers || Math.floor(Math.random() * 500) + 50,
        priority: row.priority || "Normal",
        delay: row.delay || "Right Time"
      }))
      .filter(train => {
        const schedMin = timeToMinutes(train.scheduled);
        return schedMin !== null && Math.abs(schedMin - nowMinutes) <= 240; // 4-hour window
      })
      .sort((a, b) => {
        const aMin = timeToMinutes(a.scheduled);
        const bMin = timeToMinutes(b.scheduled);
        return (aMin || 0) - (bMin || 0);
      });
    
    res.json({ 
      trains,
      currentTime: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
      totalTrains: trains.length
    });
  });
});

// Weather data with caching
let cachedWeather = null;
let lastWeatherFetch = 0;
const WEATHER_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

app.get('/api/weather', (req, res) => {
  const now = Date.now();
  
  // Return cached data if available and fresh
  if (cachedWeather && (now - lastWeatherFetch) < WEATHER_CACHE_DURATION) {
    return res.json({
      ...cachedWeather,
      cached: true,
      lastUpdated: new Date(lastWeatherFetch).toISOString()
    });
  }
  
  // Fetch fresh weather data
  const pyProcess = spawn('python', [path.join(__dirname, '..', 'py', 'scrape_weather.py')]);
  let dataString = '';
  
  pyProcess.stdout.on('data', (data) => {
    dataString += data.toString();
  });
  
  pyProcess.stderr.on('data', (data) => {
    console.error('Weather script error:', data.toString());
  });
  
  pyProcess.on('close', (code) => {
    try {
      const weather = JSON.parse(dataString.replace(/'/g, '"'));
      cachedWeather = weather;
      lastWeatherFetch = Date.now();
      
      res.json({
        ...weather,
        cached: false,
        lastUpdated: new Date().toISOString(),
        location: "Bararuni Junction, Bihar"
      });
    } catch (e) {
      console.error('Weather parse error:', e);
      if (cachedWeather) {
        res.json({
          ...cachedWeather,
          cached: true,
          error: 'Failed to fetch new data',
          lastUpdated: new Date(lastWeatherFetch).toISOString()
        });
      } else {
        res.status(500).json({ error: 'Failed to fetch weather data' });
      }
    }
  });
});

// Update real-time data for specific train
app.post('/api/update-train/:trainId', (req, res) => {
  const trainId = req.params.trainId;
  const todayDb = new sqlite3.Database(todayDbPath);
  
  todayDb.get('SELECT rowid, train_number, train_name FROM allocations WHERE train_number = ?', [trainId], (err, row) => {
    if (err || !row) {
      todayDb.close();
      return res.status(404).json({ error: 'Train not found' });
    }
    
    const formattedName = (row.train_name || '').toLowerCase().replace(/\s+/g, '-');
    const inputStr = `${formattedName}-${row.train_number}`;
    const pyPath = path.join(__dirname, '..', 'py', 'real_time.py');
    const pyProcess = spawn('python', [pyPath, inputStr]);
    
    let dataString = '';
    pyProcess.stdout.on('data', (chunk) => {
      dataString += chunk.toString();
    });
    
    pyProcess.on('close', () => {
      try {
        const parsed = JSON.parse(dataString.replace(/'/g, '"'));
        const realArrival = parsed.real_arrival || null;
        const delay = parsed.delay || null;
        
        todayDb.run(
          'UPDATE allocations SET real_arrival = ?, delay = ? WHERE rowid = ?',
          [realArrival, delay, row.rowid],
          (err2) => {
            todayDb.close();
            if (err2) {
              return res.status(500).json({ error: 'Update failed' });
            }
            res.json({
              trainId,
              realArrival,
              delay,
              updated: new Date().toISOString()
            });
          }
        );
      } catch (e) {
        todayDb.close();
        res.status(500).json({ error: 'Failed to parse real-time data' });
      }
    });
  });
});

// Database health check
app.get('/api/db-health', (req, res) => {
  const mainDb = new sqlite3.Database(mainDbPath);
  mainDb.get('SELECT COUNT(*) as count FROM allocations', (err, mainResult) => {
    mainDb.close();
    
    const todayDb = new sqlite3.Database(todayDbPath);
    todayDb.get('SELECT COUNT(*) as count FROM allocations', (err2, todayResult) => {
      todayDb.close();
      
      res.json({
        mainDb: err ? 'error' : `${mainResult.count} records`,
        todayDb: err2 ? 'error' : `${todayResult.count} records`,
        status: (!err && !err2) ? 'healthy' : 'issues detected'
      });
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚂 Train Management Server running on http://localhost:${PORT}`);
  console.log('📊 Initializing today\'s database...');
  initializeTodayDb();
  
  console.log('\n📡 Available API endpoints:');
  console.log('  GET  /api/trains        - Train schedules with real-time data');
  console.log('  GET  /api/active        - Active train count');
  console.log('  GET  /api/weather       - Current weather data');
  console.log('  POST /api/update-train/:id - Update specific train real-time data');
  console.log('  GET  /api/db-health     - Database health status');
  console.log('\n🔄 Server ready for real-time train management!');
});