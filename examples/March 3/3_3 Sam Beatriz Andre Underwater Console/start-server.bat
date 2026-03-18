@echo off
cd /d "%~dp0"
echo Installing dependencies...
call npm install
if errorlevel 1 (
  echo npm install failed. Make sure Node.js is installed and on your PATH.
  pause
  exit /b 1
)
echo.
echo Starting server at http://localhost:8000
echo Open index.html at: http://localhost:8000/index.html
echo Press Ctrl+C to stop the server.
echo.
call npm start
pause
