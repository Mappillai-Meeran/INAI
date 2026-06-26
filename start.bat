@echo off
title INAI — Starting Servers
color 0A
echo.
echo  ================================================
echo    INAI — Smart Study ^& Roommate Matching
echo  ================================================
echo.

echo  [1/2] Starting Backend (port 5000)...
start "INAI Backend" cmd /k "cd /d %~dp0backend && node server.js"

timeout /t 2 /nobreak >nul

echo  [2/2] Starting Frontend (port 3000)...
start "INAI Frontend" cmd /k "cd /d %~dp0 && npx --yes http-server -p 3000 -c-1 --cors"

timeout /t 3 /nobreak >nul

echo.
echo  ================================================
echo    Both servers are running!
echo.
echo    Frontend :  http://localhost:3000
echo    Backend  :  http://localhost:5000
echo.
echo    Close the two server windows to stop.
echo  ================================================
echo.

start "" http://localhost:3000
exit
