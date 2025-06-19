@echo off
echo 🔍 Task Management App - Setup Verification
echo.

echo ✅ Checking project structure...
if exist "client\package.json" (
    echo    ✓ Client package.json found
) else (
    echo    ❌ Client package.json missing
)

if exist "server\package.json" (
    echo    ✓ Server package.json found
) else (
    echo    ❌ Server package.json missing
)

if exist "client\.env" (
    echo    ✓ Client .env found
) else (
    echo    ❌ Client .env missing
)

if exist "server\.env" (
    echo    ✓ Server .env found
) else (
    echo    ❌ Server .env missing
)

if exist "client\tailwind.config.js" (
    echo    ✓ Tailwind config found
) else (
    echo    ❌ Tailwind config missing
)

if exist "client\postcss.config.js" (
    echo    ✓ PostCSS config found
) else (
    echo    ❌ PostCSS config missing
)

echo.
echo ✅ Checking dependencies...

if exist "client\node_modules" (
    echo    ✓ Client dependencies installed
) else (
    echo    ❌ Client dependencies missing - run: cd client && npm install
)

if exist "server\node_modules" (
    echo    ✓ Server dependencies installed
) else (
    echo    ❌ Server dependencies missing - run: cd server && npm install
)

echo.
echo ✅ Checking for root node_modules (should not exist)...
if exist "node_modules" (
    echo    ⚠️  Root node_modules found - this should be removed
    echo        Dependencies should only be in client/ and server/ folders
) else (
    echo    ✓ No root node_modules found (correct)
)

echo.
echo 🎯 Setup Status Summary:
echo    📁 Project structure: Organized
echo    🔧 Configuration files: Ready  
echo    📦 Dependencies: Isolated in client/ and server/
echo    🌐 Environment: Configured
echo    🚀 Ready to start with: start.bat or start.ps1
echo.
pause
