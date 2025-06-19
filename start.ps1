# Task Management App Startup Script for PowerShell

Write-Host "🚀 Starting Task Management Application..." -ForegroundColor Green
Write-Host ""

# Function to check if a command exists
function Test-Command($command) {
    try {
        Get-Command $command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-Command "node")) {
    Write-Host "❌ Node.js is not installed. Please install Node.js v16 or higher." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Command "npm")) {
    Write-Host "❌ npm is not installed. Please install npm." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Node.js and npm are installed" -ForegroundColor Green
Write-Host ""

# Check if .env files exist
Write-Host "🔧 Checking environment configuration..." -ForegroundColor Yellow

if (-not (Test-Path "client\.env")) {
    Write-Host "⚠️  Client .env file not found. Creating from template..." -ForegroundColor Yellow
    Copy-Item "client\.env.example" "client\.env"
    Write-Host "✅ Created client/.env from template" -ForegroundColor Green
}

if (-not (Test-Path "server\.env")) {
    Write-Host "⚠️  Server .env file not found. Creating from template..." -ForegroundColor Yellow
    Copy-Item "server\.env.example" "server\.env"
    Write-Host "✅ Created server/.env from template" -ForegroundColor Green
}

Write-Host ""

# Check and install dependencies
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow

if (-not (Test-Path "client\node_modules")) {
    Write-Host "Installing client dependencies..." -ForegroundColor Yellow
    Set-Location client
    npm install
    Set-Location ..
} else {
    Write-Host "✅ Client dependencies already installed" -ForegroundColor Green
}

if (-not (Test-Path "server\node_modules")) {
    Write-Host "Installing server dependencies..." -ForegroundColor Yellow
    Set-Location server
    npm install
    Set-Location ..
} else {
    Write-Host "✅ Server dependencies already installed" -ForegroundColor Green
}

Write-Host "✅ All dependencies ready" -ForegroundColor Green
Write-Host ""

# Start applications
Write-Host "🚀 Starting applications..." -ForegroundColor Green
Write-Host ""
Write-Host "Server will start on: http://localhost:5001" -ForegroundColor Cyan
Write-Host "Client will start on: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop both applications" -ForegroundColor Yellow
Write-Host ""

# Start server in new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\server'; npm run dev" -WindowStyle Normal

# Wait a moment for server to start
Start-Sleep -Seconds 3

# Start client in current window
Set-Location client
npm run dev
