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

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AI Train Traffic Management System API',
    status: 'running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      'GET /': 'API Information',
      'GET /api/health': 'Simple health check',
      'GET /api/db-health': 'Database health check (if DB available)',
      'GET /api/active': 'Count active trains',
      'GET /api/today': 'Get today\'s train allocations',
      'GET /api/trains': 'Get all train data'
    }
  });
});

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Database health check with error handling
app.get('/api/db-health', (req, res) => {
  try {
    const mainDbPath = path.join(__dirname, '../../AITTMS-database/database/train_allocations.db');
    const todayDbPath = path.join(__dirname, '../../AITTMS-database/database/today.db');
    
    // Check if files exist first
    const fs = require('fs');
    const mainDbExists = fs.existsSync(mainDbPath);
    const todayDbExists = fs.existsSync(todayDbPath);
    
    if (!mainDbExists || !todayDbExists) {
      return res.json({
        status: 'warning',
        message: 'Database files not found - this is expected in cloud deployment',
        main_db: mainDbExists ? 'found' : 'not found',
        today_db: todayDbExists ? 'found' : 'not found'
      });
    }
    
    // If files exist, try to connect
    const sqlite3 = require('sqlite3').verbose();
    let mainDbStatus = 'ok';
    let todayDbStatus = 'ok';
    
    const mainDb = new sqlite3.Database(mainDbPath, (err) => {
      if (err) mainDbStatus = err.message;
      mainDb.close();
      
      const todayDb = new sqlite3.Database(todayDbPath, (err2) => {
        if (err2) todayDbStatus = err2.message;
        todayDb.close();
        
        res.json({
          train_allocations_db: mainDbStatus,
          today_db: todayDbStatus
        });
      });
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Database check failed',
      message: error.message
    });
  }
});

// Mock data endpoints for testing
app.get('/api/active', (req, res) => {
  res.json({
    count: 5,
    message: 'Mock data - 5 active trains',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/today', (req, res) => {
  res.json({
    trains: [
      {
        id: 1,
        train_number: '12345',
        train_name: 'Express Train',
        exp_arrival: '14:30',
        status: 'On Time'
      },
      {
        id: 2,
        train_number: '67890',
        train_name: 'Passenger Train',
        exp_arrival: '15:45',
        status: 'Delayed'
      }
    ],
    message: 'Mock data for testing',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/trains', (req, res) => {
  res.json({
    trains: [
      { id: 1, name: 'Express 1', number: '12345', route: 'Station A to Station B' },
      { id: 2, name: 'Local 1', number: '67890', route: 'Station C to Station D' },
      { id: 3, name: 'Fast Train', number: '11111', route: 'Station E to Station F' }
    ],
    total: 3,
    message: 'Mock train data',
    timestamp: new Date().toISOString()
  });
});

// Weather endpoint (mock for now)
app.get('/api/weather', (req, res) => {
  res.json({
    temperature: '25°C',
    condition: 'Sunny',
    humidity: '60%',
    message: 'Mock weather data',
    timestamp: new Date().toISOString()
  });
});

// Catch all other routes
app.get('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    available_routes: [
      'GET /',
      'GET /api/health',
      'GET /api/db-health',
      'GET /api/active',
      'GET /api/today',
      'GET /api/trains',
      'GET /api/weather'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Access your API at: http://localhost:${PORT}`);
});