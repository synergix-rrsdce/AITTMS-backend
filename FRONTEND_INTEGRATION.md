# 🔗 Frontend-Backend Connection Guide

## 🌐 Backend API Base URL
```
https://your-app-name.onrender.com
```

## 📋 Available Endpoints

### Core Endpoints:
- `GET /` - API Information
- `GET /api/health` - Health Check
- `GET /api/active` - Active Trains Count
- `GET /api/today` - Today's Train Schedule
- `GET /api/trains` - All Trains Data
- `GET /api/weather` - Weather Information

## 🔧 Frontend Setup

### Environment Variables (Add to Vercel):
```
REACT_APP_API_URL=https://your-app-name.onrender.com
```
(Use `NEXT_PUBLIC_API_URL` for Next.js or `VITE_API_URL` for Vite)

### Example API Call:
```javascript
const API_URL = process.env.REACT_APP_API_URL;

// Fetch today's trains
const fetchTrains = async () => {
  const response = await fetch(`${API_URL}/api/today`);
  const data = await response.json();
  return data;
};
```

## 🚀 Deployment Steps
1. Deploy backend on Render.com
2. Get your Render URL
3. Add environment variable in Vercel
4. Update CORS in server.js with your actual Vercel URL
5. Test the connection

That's it! 🎉