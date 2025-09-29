# Use Node.js 18 as base image
FROM node:18-slim

# Install Python, pip, and build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies with specific versions and build flags
RUN pip3 install --no-cache-dir --upgrade pip setuptools wheel && \
    pip3 install --no-cache-dir \
    joblib==1.3.2 \
    numpy==1.24.3 \
    pandas==2.0.3 \
    scikit-learn==1.3.0 \
    requests==2.31.0 \
    beautifulsoup4==4.12.2

# Install xgboost separately (often causes issues)
RUN pip3 install --no-cache-dir xgboost==1.7.6

# Copy all files
COPY . .

# Install Node.js dependencies
WORKDIR /app/backend
RUN npm install --production

# Expose port
EXPOSE 10000

# Set environment variable for port
ENV PORT=10000

# Start the application
CMD ["npm", "start"]