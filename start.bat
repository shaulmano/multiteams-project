@echo off
title Scrum Dashboard
echo.
echo ==========================================
echo   Scrum Dashboard - Starting...
echo ==========================================
echo.
echo Server: http://localhost:3001
echo App:    http://localhost:5173
echo.
echo Press Ctrl+C to stop.
echo.
cd /d "%~dp0"
npm run dev
