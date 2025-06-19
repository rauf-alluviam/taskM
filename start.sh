#!/bin/bash

# Task Management App Startup Script

echo "🚀 Starting Task Management Application..."
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ Node.js and npm are installed"
echo ""

# Check if .env files exist
echo "🔧 Checking environment configuration..."

if [ ! -f "client/.env" ]; then
    echo "⚠️  Client .env file not found. Creating from template..."
    cp client/.env.example client/.env
    echo "✅ Created client/.env from template"
fi

if [ ! -f "server/.env" ]; then
    echo "⚠️  Server .env file not found. Creating from template..."
    cp server/.env.example server/.env
    echo "✅ Created server/.env from template"
fi

echo ""

# Install dependencies
echo "📦 Installing dependencies..."

echo "Installing client dependencies..."
cd client
npm install
cd ..

echo "Installing server dependencies..."
cd server
npm install
cd ..

echo "✅ Dependencies installed"
echo ""

# Start applications
echo "🚀 Starting applications..."
echo ""
echo "Starting server on http://localhost:5000..."
echo "Starting client on http://localhost:3000..."
echo ""
echo "Press Ctrl+C to stop both applications"
echo ""

# Start server in background
cd server
npm run dev &
SERVER_PID=$!

# Wait a moment for server to start
sleep 2

# Start client
cd ../client
npm run dev &
CLIENT_PID=$!

# Wait for user input to stop
wait

# Cleanup
kill $SERVER_PID $CLIENT_PID 2>/dev/null
