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
  res.json({ count: 5, message: 'Active trains' });
});

// Today's trains
app.get('/api/today', (req, res) => {
  res.json({
    trains: [
      { id: 1, number: '12345', name: 'Express Train', arrival: '14:30', status: 'On Time' },
      { id: 2, number: '67890', name: 'Passenger Train', arrival: '15:45', status: 'Delayed' }
    ]
  });
});

// All trains
app.get('/api/trains', (req, res) => {
  res.json({
    trains: [
      { id: 1, name: 'Express 1', number: '12345', route: 'A to B' },
      { id: 2, name: 'Local 1', number: '67890', route: 'C to D' },
      { id: 3, name: 'Fast Train', number: '11111', route: 'E to F' }
    ]
  });
});

// Weather data
app.get('/api/weather', (req, res) => {
  res.json({
    temperature: '25°C',
    condition: 'Sunny',
    humidity: '60%'
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