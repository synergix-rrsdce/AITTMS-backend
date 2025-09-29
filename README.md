# 🚂 AI Train Traffic Management System - Backend

A simple Node.js Express API for train traffic management.

## 🚀 Quick Deploy to Render.com

1. **Fork/Clone this repository**
2. **Go to [render.com](https://render.com)**
3. **Create new Web Service**
4. **Connect your GitHub repo**
5. **Settings:**
   ```
   Environment: Node.js
   Build Command: cd backend && npm install
   Start Command: cd backend && npm start
   ```
6. **Environment Variables:**
   - `NODE_ENV` = `production`
   - `PORT` = `10000`
7. **Deploy!**

## 🌐 API Endpoints

- `GET /` - API Information
- `GET /api/health` - Health Check
- `GET /api/active` - Active Trains
- `GET /api/today` - Today's Schedule
- `GET /api/trains` - All Trains
- `GET /api/weather` - Weather Data

## 🔗 Frontend Integration

Add to your frontend environment variables:
```
REACT_APP_API_URL=https://your-app-name.onrender.com
```

## 📁 Project Structure
```
backend/
├── package.json    # Dependencies
└── server.js       # Express server
```

Simple and clean! 🎉