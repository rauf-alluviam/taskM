#!/bin/bash

# Production Build Script for S3 Deployment
# This script ensures environment variables are properly configured for production

echo "🚀 Starting production build for S3 deployment..."

# Set production environment variables
export NODE_ENV=production
export VITE_APP_URL=http://15.207.11.214:5003/api
export VITE_SOCKET_URL=http://15.207.11.214:5003
export VITE_APP_NAME="Task Management App"
export VITE_APP_VERSION="1.0.0"

echo "📋 Environment variables set:"
echo "  VITE_APP_URL: $VITE_APP_URL"
echo "  VITE_SOCKET_URL: $VITE_SOCKET_URL"
echo "  NODE_ENV: $NODE_ENV"

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist/

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the application
echo "🔨 Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "📁 Build output is in ./dist/"
    echo ""
    echo "🌐 Next steps for S3 deployment:"
    echo "  1. Upload the contents of ./dist/ to your S3 bucket"
    echo "  2. Ensure your S3 bucket is configured for static website hosting"
    echo "  3. Set error document to index.html for SPA routing"
    echo ""
    echo "📋 API Configuration:"
    echo "  - API calls will go to: $VITE_APP_URL"
    echo "  - WebSocket will connect to: $VITE_SOCKET_URL"
    echo ""
    echo "🔍 To verify the configuration:"
    echo "  - Check browser developer tools for API calls"
    echo "  - Ensure CORS is configured on your backend server"
else
    echo "❌ Build failed!"
    exit 1
fi
