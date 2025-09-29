const express = require('express');
const cors = require('cors');
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

// Try to load SQLite, fallback to mock data if it fails
let sqlite3;
let useMockData = false;

try {
  sqlite3 = require('sqlite3').verbose();
  console.log('SQLite3 loaded successfully');
} catch (error) {
  console.log('SQLite3 failed to load, using mock data:', error.message);
  useMockData = true;
}

// Database setup (only if SQLite3 is available)
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

// Mock data for fallback
const mockTrains = [
  {
    id: 1,
    train_number: '12345',
    train_name: 'Rajdhani Express',
    from_station: 'New Delhi',
    to_station: 'Mumbai',
    exp_arrival: '14:30',
    allocated_platform: '1',
    status: 'On Time',
    type: 'Express',
    passengers: 450
  },
  {
    id: 2,
    train_number: '67890',
    train_name: 'Shatabdi Express',
    from_station: 'Chennai',
    to_station: 'Bangalore',
    exp_arrival: '15:45',
    allocated_platform: '2',
    status: 'Delayed',
    type: 'Express',
    passengers: 380
  },
  {
    id: 3,
    train_number: '11111',
    train_name: 'Duronto Express',
    from_station: 'Kolkata',
    to_station: 'Delhi',
    exp_arrival: '16:15',
    allocated_platform: '3',
    status: 'On Time',
    type: 'Express',
    passengers: 520
  }
];

// Function to create/overwrite today.db for the current day
function createTodayDb(callback) {
  if (useMockData) {
    if (callback) callback(null);
    return;
  }

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

// Create today.db at server start (only if SQLite is available)
if (!useMockData) {
  createTodayDb((err) => {
    if (err) {
      console.error('Failed to create today.db:', err);
      useMockData = true;
    } else {
      console.log('Successfully created today.db for', todayValue);
    }
  });
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AI Train Traffic Management System API',
    status: 'running',
    dataSource: useMockData ? 'mock' : 'database',
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
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    dataSource: useMockData ? 'mock' : 'database'
  });
});

// Active trains count
app.get('/api/active', (req, res) => {
  if (useMockData) {
    res.json({ count: mockTrains.length });
    return;
  }

  const todayDb = new sqlite3.Database(todayDbPath);
  todayDb.get('SELECT COUNT(*) as count FROM allocations', (err, row) => {
    todayDb.close();
    if (err) {
      console.error('Database error:', err);
      res.json({ count: mockTrains.length }); // Fallback to mock data
      return;
    }
    res.json({ count: row.count });
  });
});

// Today's trains
app.get('/api/today', (req, res) => {
  if (useMockData) {
    res.json({ day: todayValue, trains: mockTrains });
    return;
  }

  const todayDb = new sqlite3.Database(todayDbPath);
  todayDb.all('SELECT * FROM allocations', (err, rows) => {
    todayDb.close();
    if (err) {
      console.error('Database error:', err);
      res.json({ day: todayValue, trains: mockTrains }); // Fallback to mock data
      return;
    }
    res.json({ day: todayValue, trains: rows });
  });
});

// All trains
app.get('/api/trains', (req, res) => {
  if (useMockData) {
    // Transform mock data to match expected format
    const trains = mockTrains.map(train => ({
      id: train.train_number,
      name: train.train_name,
      number: train.train_number,
      type: train.type,
      from: train.from_station,
      to: train.to_station,
      scheduled: train.exp_arrival,
      estimated: train.exp_arrival,
      status: train.status,
      platform: train.allocated_platform,
      passengers: train.passengers,
      priority: "High"
    }));
    res.json({ trains });
    return;
  }

  const todayDb = new sqlite3.Database(todayDbPath);
  todayDb.all('SELECT * FROM allocations', (err, rows) => {
    todayDb.close();
    if (err) {
      console.error('Database error:', err);
      // Fallback to mock data
      const trains = mockTrains.map(train => ({
        id: train.train_number,
        name: train.train_name,
        number: train.train_number,
        type: train.type,
        from: train.from_station,
        to: train.to_station,
        scheduled: train.exp_arrival,
        estimated: train.exp_arrival,
        status: train.status,
        platform: train.allocated_platform,
        passengers: train.passengers,
        priority: "High"
      }));
      res.json({ trains });
      return;
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

// Weather data (using Python script or mock data)
app.get('/api/weather', (req, res) => {
  // Mock weather data for now (Python script requires additional setup)
  res.json({
    temperature: 25,
    humidity: 60,
    precipitation: 0,
    condition: 'Sunny'
  });
});

// 404 handler
app.get('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Data source: ${useMockData ? 'Mock data' : 'SQLite database'}`);
});