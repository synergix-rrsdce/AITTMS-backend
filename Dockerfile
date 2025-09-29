# Use Node.js 18 as base image
FROM node:18-slim

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy all files
COPY . .

# Install Python dependencies
RUN pip3 install --no-cache-dir joblib numpy pandas scikit-learn xgboost requests beautifulsoup4

# Install Node.js dependencies
WORKDIR /app/backend
RUN npm install

# Expose port
EXPOSE 4001

# Set environment variable for port
ENV PORT=4001

# Start the application
CMD ["npm", "start"]