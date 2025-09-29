const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = process.env.PORT || 4001;

// Simple CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    /https:\/\/.*\.vercel\.app$/,
    /https:\/\/.*\.onrender\.com$/
  ]
}));

app.use(express.json());

// Database setup
const path = require('path');
const fs = require('fs');

// Function to get present day as a string (e.g., 'Sun', 'Mon', etc.)
function getPresentDay() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[new Date().getDay()];
}

let todayValue = getPresentDay();

// Database paths
const dbPath = path.join(__dirname, 'database', 'train_allocations.db');
const todayDbPath = path.join(__dirname, 'database', 'today.db');

// Function to create/overwrite today.db for the current day
function createTodayDb(callback) {
  // Remove existing today.db if it exists
  if (fs.existsSync(todayDbPath)) {
    try {
      fs.unlinkSync(todayDbPath);
    } catch (err) {
      console.log('Warning: Could not remove existing today.db:', err.message);
    }
  }

  const todayDb = new sqlite3.Database(todayDbPath);
  todayDb.serialize(() => {
    // Attach the main database
    todayDb.run(`ATTACH DATABASE ? AS mainDb`, [dbPath], (err1) => {
      if (err1) {
        console.error('Error attaching main database:', err1);
        todayDb.close();
        if (callback) callback(err1);
        return;
      }
      
      // Create the allocations table structure with today's data
      todayDb.run(`CREATE TABLE allocations AS SELECT * FROM mainDb.allocations WHERE days = ?`, [todayValue], (err2) => {
        if (err2) {
          console.error('Error creating today.db table:', err2);
        }
        todayDb.close();
        if (callback) callback(err2);
      });
    });
  });
}

// Create today.db at server start
createTodayDb((err) => {
  if (err) {
    console.error('Failed to create today.db:', err);
  } else {
    console.log('Successfully created today.db for', todayValue);
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AI Train Traffic Management System API',
    status: 'running',
    endpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/active',
      'GET /api/today',
      'GET /api/trains',
      'GET /api/weather'
    ]
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Active trains count
app.get('/api/active', (req, res) => {
  const todayDb = new sqlite3.Database(todayDbPath);
  todayDb.get('SELECT COUNT(*) as count FROM allocations', (err, row) => {
    todayDb.close();
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ count: row.count });
  });
});

// Today's trains
app.get('/api/today', (req, res) => {
  const todayDb = new sqlite3.Database(todayDbPath);
  todayDb.all('SELECT * FROM allocations', (err, rows) => {
    todayDb.close();
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ day: todayValue, trains: rows });
  });
});

// All trains
app.get('/api/trains', (req, res) => {
  const todayDb = new sqlite3.Database(todayDbPath);
  todayDb.all('SELECT * FROM allocations', (err, rows) => {
    todayDb.close();
    if (err) {
      console.error('Database error:', err);
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
    
    // Transform and filter trains within ±2 hours (120 minutes) of now
    const trains = rows
      .map(row => ({
        id: row.train_number?.toString() || row.id?.toString() || '',
        name: row.train_name,
        number: row.train_number,
        type: row.type || "Express",
        from: row.from_station || "",
        to: row.to_station || "",
        scheduled: row.exp_arrival || row.arrives || "",
        estimated: row.real_arrival || row.estimated || "",
        status: row.delay ? `Delayed ${row.delay}` : "On Time",
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

// Weather data (using Python script)
app.get('/api/weather', (req, res) => {
  const { spawn } = require('child_process');
  const pyPath = path.join(__dirname, 'py', 'scrape_weather.py');
  
  const pyProcess = spawn('python', [pyPath]);
  let dataString = '';
  
  pyProcess.stdout.on('data', (data) => {
    dataString += data.toString();
  });
  
  pyProcess.on('close', (code) => {
    if (code !== 0) {
      return res.json({
        temperature: 25,
        humidity: 60,
        precipitation: 0,
        condition: 'Sunny',
        error: 'Weather data unavailable'
      });
    }
    
    try {
      const weatherData = JSON.parse(dataString);
      res.json(weatherData);
    } catch (e) {
      res.json({
        temperature: 25,
        humidity: 60,
        precipitation: 0,
        condition: 'Sunny',
        error: 'Weather parsing error'
      });
    }
  });
  
  pyProcess.on('error', (err) => {
    res.json({
      temperature: 25,
      humidity: 60,
      precipitation: 0,
      condition: 'Sunny',
      error: 'Python script error'
    });
  });
});

// 404 handler
app.get('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});