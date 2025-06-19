@echo off
echo 🚀 Starting Task Management Application...
echo.

REM Check prerequisites
echo 📋 Checking prerequisites...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js v16 or higher.
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm.
    pause
    exit /b 1
)

echo ✅ Node.js and npm are installed
echo.

REM Check if .env files exist
echo 🔧 Checking environment configuration...

if not exist "client\.env" (
    echo ⚠️  Client .env file not found. Creating from template...
    copy "client\.env.example" "client\.env" >nul
    echo ✅ Created client/.env from template
)

if not exist "server\.env" (
    echo ⚠️  Server .env file not found. Creating from template...
    copy "server\.env.example" "server\.env" >nul
    echo ✅ Created server/.env from template
)

echo.

REM Check and install dependencies
echo 📦 Checking dependencies...

if not exist "client\node_modules" (
    echo Installing client dependencies...
    cd client
    call npm install
    cd ..
) else (
    echo ✅ Client dependencies already installed
)

if not exist "server\node_modules" (
    echo Installing server dependencies...
    cd server
    call npm install
    cd ..
) else (
    echo ✅ Server dependencies already installed
)

echo ✅ All dependencies ready
echo.

REM Start applications
echo 🚀 Starting applications...
echo.
echo Server will start on: http://localhost:5001
echo Client will start on: http://localhost:3000
echo.
echo Press Ctrl+C to stop both applications
echo.

REM Start server in new window
start "Task Management Server" cmd /c "cd server && npm run dev"

REM Wait a moment for server to start
timeout /t 3 /nobreak >nul

REM Start client in current window
cd client
npm run dev

pause
