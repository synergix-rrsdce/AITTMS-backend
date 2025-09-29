# Frontend-Backend Connection Guide

## API Endpoints Available:

### Base URL: `https://your-backend-app.railway.app`

### Endpoints:
- `GET /` - API Information and health
- `GET /api/db-health` - Database health check
- `GET /api/active` - Count active trains
- `GET /api/today` - Get today's train allocations
- `GET /api/trains` - Get all train data
- `POST /api/update-realtime` - Update real-time train data
- `GET /api/allocations/real-time` - Get real-time allocations
- `GET /api/weather` - Get current weather data

## Frontend Integration:

### 1. Update your Vercel frontend environment variables:
```
REACT_APP_API_URL=https://your-backend-app.railway.app
NEXT_PUBLIC_API_URL=https://your-backend-app.railway.app
VITE_API_URL=https://your-backend-app.railway.app
```

### 2. Example API calls from frontend:
```javascript
// Fetch today's trains
const response = await fetch(`${process.env.REACT_APP_API_URL}/api/today`);
const trains = await response.json();

// Fetch real-time data
const realtimeResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/allocations/real-time`);
const realtimeData = await realtimeResponse.json();
```

### 3. CORS Configuration:
The backend is configured to accept requests from:
- All Vercel domains (*.vercel.app)
- Local development (localhost:3000, localhost:5173)

## Next Steps:
1. Deploy this backend to Railway
2. Update the CORS origin with your actual Vercel URL
3. Set environment variables in your frontend
4. Test the connection