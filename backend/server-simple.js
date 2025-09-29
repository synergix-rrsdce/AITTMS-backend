const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
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

// Function to get present day as a string (e.g., 'Sun', 'Mon', etc.)
function getPresentDay() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[new Date().getDay()];
}

let todayValue = getPresentDay();

// Mock data for trains (simulating database data)
const trainAllocations = [
  {
    id: 1,
    train_number: '12345',
    train_name: 'Rajdhani Express',
    from_station: 'New Delhi',
    to_station: 'Mumbai Central',
    exp_arrival: '14:30',
    real_arrival: null,
    delay: null,
    allocated_platform: '1',
    status: 'On Time',
    type: 'Express',
    passengers: 450,
    priority: 'High',
    days: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat'
  },
  {
    id: 2,
    train_number: '67890',
    train_name: 'Shatabdi Express',
    from_station: 'Chennai Central',
    to_station: 'Bangalore City',
    exp_arrival: '15:45',
    real_arrival: '16:00',
    delay: '15 min',
    allocated_platform: '2',
    status: 'Delayed',
    type: 'Express',
    passengers: 380,
    priority: 'High',
    days: 'Mon,Tue,Wed,Thu,Fri,Sat'
  },
  {
    id: 3,
    train_number: '11111',
    train_name: 'Duronto Express',
    from_station: 'Kolkata',
    to_station: 'New Delhi',
    exp_arrival: '16:15',
    real_arrival: null,
    delay: null,
    allocated_platform: '3',
    status: 'On Time',
    type: 'Express',
    passengers: 520,
    priority: 'High',
    days: 'Sun,Mon,Wed,Fri'
  },
  {
    id: 4,
    train_number: '22222',
    train_name: 'Garib Rath',
    from_station: 'Mumbai Central',
    to_station: 'New Delhi',
    exp_arrival: '17:30',
    real_arrival: null,
    delay: null,
    allocated_platform: '4',
    status: 'On Time',
    type: 'Express',
    passengers: 600,
    priority: 'Medium',
    days: 'Tue,Thu,Sat'
  },
  {
    id: 5,
    train_number: '33333',
    train_name: 'Jan Shatabdi',
    from_station: 'Pune',
    to_station: 'Mumbai Central',
    exp_arrival: '18:45',
    real_arrival: null,
    delay: null,
    allocated_platform: '5',
    status: 'On Time',
    type: 'Express',
    passengers: 320,
    priority: 'Medium',
    days: 'Mon,Tue,Wed,Thu,Fri'
  }
];

// Function to get today's trains based on day
function getTodaysTrains() {
  return trainAllocations.filter(train => {
    return train.days.includes(todayValue);
  });
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AI Train Traffic Management System API',
    status: 'running',
    dataSource: 'json',
    day: todayValue,
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
    dataSource: 'json'
  });
});

// Active trains count
app.get('/api/active', (req, res) => {
  const todaysTrains = getTodaysTrains();
  res.json({ count: todaysTrains.length });
});

// Today's trains
app.get('/api/today', (req, res) => {
  const todaysTrains = getTodaysTrains();
  res.json({ day: todayValue, trains: todaysTrains });
});

// All trains (filtered by time window)
app.get('/api/trains', (req, res) => {
  const todaysTrains = getTodaysTrains();
  
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
  
  // Transform and filter trains within ±4 hours (240 minutes) of now for demo
  const trains = todaysTrains
    .map(train => ({
      id: train.train_number,
      name: train.train_name,
      number: train.train_number,
      type: train.type,
      from: train.from_station,
      to: train.to_station,
      scheduled: train.exp_arrival,
      estimated: train.real_arrival || train.exp_arrival,
      status: train.delay ? `Delayed ${train.delay}` : train.status,
      platform: train.allocated_platform,
      passengers: train.passengers,
      priority: train.priority
    }))
    .filter(train => {
      const schedMin = timeToMinutes(train.scheduled);
      return schedMin !== null && Math.abs(schedMin - nowMinutes) <= 240; // 4 hour window
    });
    
  res.json({ trains });
});

// Weather data (mock data)
app.get('/api/weather', (req, res) => {
  const weatherConditions = ['Sunny', 'Cloudy', 'Rainy', 'Clear'];
  const randomTemp = Math.floor(Math.random() * 15) + 20; // 20-35°C
  const randomHumidity = Math.floor(Math.random() * 40) + 40; // 40-80%
  const randomCondition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
  
  res.json({
    temperature: randomTemp,
    humidity: randomHumidity,
    precipitation: randomCondition === 'Rainy' ? Math.floor(Math.random() * 10) : 0,
    condition: randomCondition
  });
});

// Update real-time data endpoint (simulates Python script updates)
app.post('/api/update-realtime', (req, res) => {
  const todaysTrains = getTodaysTrains();
  let updatedCount = 0;
  
  // Simulate updating some trains with delays
  todaysTrains.forEach((train, index) => {
    if (Math.random() > 0.7) { // 30% chance of delay
      const delay = Math.floor(Math.random() * 30) + 5; // 5-35 minutes
      train.delay = `${delay} min`;
      train.status = 'Delayed';
      
      // Update real arrival time
      const [h, m] = train.exp_arrival.split(':').map(Number);
      const delayedMinutes = m + delay;
      const newHour = h + Math.floor(delayedMinutes / 60);
      const newMinute = delayedMinutes % 60;
      train.real_arrival = `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
      
      updatedCount++;
    }
  });
  
  res.json({ updated: updatedCount, message: `Updated ${updatedCount} trains with real-time data` });
});

// Get database health (mock)
app.get('/api/db-health', (req, res) => {
  res.json({
    train_allocations_db: 'ok',
    today_db: 'ok',
    total_trains: trainAllocations.length,
    today_trains: getTodaysTrains().length
  });
});

// 404 handler
app.get('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Data source: JSON (${trainAllocations.length} total trains)`);
  console.log(`📅 Today is ${todayValue}, serving ${getTodaysTrains().length} trains`);
});