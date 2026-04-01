@echo off
echo Starting AI Study Planner...
echo.

echo [CLEANUP] Stopping any running Node.js processes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 1 /nobreak >nul

echo [BACKEND] Starting Express server on port 5000...
start cmd /k "cd /d d:\AI Study Planner\AI Study Planner\server && node index.js"
timeout /t 2 /nobreak >nul

echo [FRONTEND] Starting React app on port 5173...
start cmd /k "cd /d d:\AI Study Planner\AI Study Planner && npx vite --port 5173 --strictPort"
echo.

echo Both servers started! Opening browser...
timeout /t 4 /nobreak >nul
start http://localhost:5173
