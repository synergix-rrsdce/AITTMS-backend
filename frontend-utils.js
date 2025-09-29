// Simple health check utility for frontend
export const healthCheck = async (baseUrl) => {
  try {
    const response = await fetch(`${baseUrl}/`);
    const data = await response.json();
    return {
      success: true,
      status: data.status,
      message: data.message,
      endpoints: data.endpoints
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// API utility functions
export const apiClient = {
  baseUrl: process.env.REACT_APP_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL,
  
  async get(endpoint) {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  
  async post(endpoint, data) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  
  // Specific API methods
  async getTrainsToday() {
    return this.get('/api/today');
  },
  
  async getActiveTrains() {
    return this.get('/api/active');
  },
  
  async getRealTimeAllocations() {
    return this.get('/api/allocations/real-time');
  },
  
  async getWeather() {
    return this.get('/api/weather');
  },
  
  async updateRealTime(trainData) {
    return this.post('/api/update-realtime', trainData);
  }
};