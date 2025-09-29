# 🚀 Deploy to Render.com (FREE) - Complete Guide

## Why Render.com?
- ✅ **750 hours/month** free tier (vs Railway's 500 hours)
- ✅ **Better performance** than most free tiers
- ✅ **Node.js + Python** support in one service
- ✅ **Auto-deploys** from GitHub
- ✅ **Free SSL certificates**
- ✅ **No credit card required** for free tier

## 📋 Step-by-Step Deployment:

### **1. Prepare Your Repository (Already Done ✅)**
- Dockerfile ✅
- render.yaml ✅
- render-build.sh ✅
- requirements.txt ✅
- Updated package.json ✅

### **2. Deploy on Render:**

1. **Go to [render.com](https://render.com)**
2. **Sign up/Login** with your GitHub account
3. **Click "New +"** → **"Web Service"**
4. **Connect GitHub repository:**
   - Repository: `synergix-rrsdce/AITTMS-backend`
   - Branch: `main`

5. **Configure the service:**
   ```
   Name: aittms-backend
   Environment: Docker
   Plan: Free
   Region: Choose closest to your users
   ```

6. **Build & Deploy Settings:**
   ```
   Build Command: ./render-build.sh
   Start Command: cd backend && npm start
   ```

7. **Environment Variables:**
   ```
   NODE_ENV = production
   PORT = 10000
   ```

8. **Click "Create Web Service"**

### **3. Alternative: Manual Setup (If YAML doesn't work)**

If the render.yaml approach has issues, use manual setup:

1. **Choose "Web Service"**
2. **Connect your GitHub repo**
3. **Settings:**
   - **Environment:** `Docker`
   - **Build Command:** `pip install -r requirements.txt && cd backend && npm install`
   - **Start Command:** `cd backend && npm start`
   - **Auto-Deploy:** `Yes`

### **4. Deployment Process:**
- Render will automatically build using your Dockerfile
- Python dependencies will be installed
- Node.js dependencies will be installed
- Your app will start on the assigned port

### **5. Get Your URL:**
Once deployed, you'll get a URL like:
`https://aittms-backend.onrender.com`

## 🔗 **Connect to Your Vercel Frontend:**

### **Update CORS in server.js:**
Replace the placeholder with your actual URLs:
```javascript
origin: [
  'http://localhost:3000',
  'https://your-frontend-app.vercel.app', // Your actual Vercel URL
  'https://aittms-backend.onrender.com',  // Your Render URL
  /https:\/\/.*\.vercel\.app$/,
  /https:\/\/.*\.onrender\.com$/
],
```

### **Add Environment Variable in Vercel:**
```
REACT_APP_API_URL = https://aittms-backend.onrender.com
```
(or `NEXT_PUBLIC_API_URL` for Next.js, `VITE_API_URL` for Vite)

## 🧪 **Test Your Deployment:**

### **Test Endpoints:**
- Health Check: `https://your-app.onrender.com/`
- API Health: `https://your-app.onrender.com/api/db-health`
- Today's Trains: `https://your-app.onrender.com/api/today`

### **Expected Response from root (/):**
```json
{
  "message": "AI Train Traffic Management System API",
  "status": "running",
  "version": "1.0.0",
  "endpoints": { ... }
}
```

## ⚡ **Performance Notes:**

### **Free Tier Limitations:**
- **750 hours/month** (about 25 hours/day)
- **Sleep after 15 min** of inactivity (first request after sleep takes ~30s)
- **512MB RAM**
- **0.1 CPU**

### **Keep Service Active:**
To prevent sleeping, you can:
1. Set up uptime monitoring (UptimeRobot, etc.)
2. Ping your service every 14 minutes
3. Upgrade to paid plan ($7/month) for no sleeping

## 🛠️ **Troubleshooting:**

### **Build Fails:**
- Check build logs in Render dashboard
- Ensure all dependencies in requirements.txt
- Verify Python/Node versions

### **App Crashes:**
- Check runtime logs
- Verify database paths are correct
- Test endpoints individually

### **Database Issues:**
- SQLite files should be in the container
- For persistence, consider upgrading to PostgreSQL (also free on Render)

## 🎯 **Final Steps:**
1. Deploy on Render ✅
2. Get your Render URL
3. Update CORS in server.js
4. Push changes to GitHub
5. Add environment variable in Vercel
6. Test frontend-backend connection

**Your backend will be live at:** `https://your-app-name.onrender.com`