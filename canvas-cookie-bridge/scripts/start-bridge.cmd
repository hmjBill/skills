@echo off
rem Start the bridge in the background if it is not already running.
rem Interpreter resolution order: CANVAS_BRIDGE_PYW env var, then pythonw in PATH.
setlocal
set "BRIDGE=%~dp0bridge.py"
set "PORT=8902"

if defined CANVAS_BRIDGE_PYW (
    set "PYW=%CANVAS_BRIDGE_PYW%"
) else (
    where pythonw >nul 2>&1
    if %errorlevel%==0 (
        set "PYW=pythonw"
    ) else (
        echo pythonw.exe not found in PATH. Set CANVAS_BRIDGE_PYW to the full
        echo path of a pythonw.exe 3.10+ and run this script again.
        exit /b 1
    )
)

netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo bridge already listening on port %PORT%
    exit /b 0
)

start "" "%PYW%" "%BRIDGE%"
timeout /t 1 /nobreak >nul
netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo bridge started on 127.0.0.1:%PORT%
) else (
    echo bridge failed to start - check "%ProgramData%\CanvasCLI-Bridge\bridge.log"
    exit /b 1
)
