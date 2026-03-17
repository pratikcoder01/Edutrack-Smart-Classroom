@echo off
echo ===================================================
echo     Starting EduTrack Smart Classroom System
echo ===================================================
echo.

:: 1. Start the Flask Backend (app.py) in a new terminal window
echo [1/3] Starting Python Flask Backend (Data and AI Handler)...
start /B cmd /c "python app.py"

timeout /t 3 /nobreak >nul

:: 2. Start the Arduino Serial Bridge in another new terminal window
echo [2/3] Starting Arduino Serial Bridge (USB Comms)...
start /B cmd /c "python serial_bridge.py"

:: 3. Open the Frontend UI in the default web browser
echo [3/3] Launching Frontend Dashboard in your browser...
start "" "Edutrack-Smart-Classroom-main\frontend\index.html"

echo.
echo ===================================================
echo   System is running! 
echo   Keep the two black command prompt windows open.
echo   To stop the system, close the command prompt windows.
echo ===================================================
pause
