@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "FXGAME="
set "LOGIN_KEY=105466859"

if not "%~1"=="" (
    if exist "%~1" (
        set "FXGAME=%~1"
    ) else if exist "%~1\bin\fxgame.exe" (
        set "FXGAME=%~1\bin\fxgame.exe"
    ) else if exist "%~1\fxgame.exe" (
        set "FXGAME=%~1\fxgame.exe"
    )
)

if not defined FXGAME (
    if exist "D:\AOOOW\BFAGE\AOW\bin\fxgame.exe" (
        set "FXGAME=D:\AOOOW\BFAGE\AOW\bin\fxgame.exe"
    )
)

if not "%~2"=="" set "LOGIN_KEY=%~2"

if not defined FXGAME (
    echo ERROR: fxgame.exe was not found.
    echo.
    echo Usage:
    echo   launch-fxgame-direct.bat "D:\AOOOW\BFAGE\AOW"
    echo.
    echo Or:
    echo   launch-fxgame-direct.bat "D:\AOOOW\BFAGE\AOW\bin\fxgame.exe"
    echo.
    echo Optional second argument overrides the captured login key:
    echo   launch-fxgame-direct.bat "D:\AOOOW\BFAGE\AOW" 105466859
    exit /b 2
)

for %%F in ("%FXGAME%") do set "FXBIN=%%~dpF"

echo =============================================
echo   Nine Yin direct client launch
echo =============================================
echo.
echo fxgame:
echo   %FXGAME%
echo.
echo game server:
echo   127.0.0.1:19061
echo.
echo server list:
echo   127.0.0.1:4000
echo.
echo login key:
echo   %LOGIN_KEY%
echo.
echo fxupdate is NOT used.
echo.

call :port_busy 19061
if "%PORT_BUSY%"=="0" (
    echo ERROR: nothing is listening on 127.0.0.1:19061.
    echo Start start-capture-session.bat first.
    exit /b 1
)

call :port_busy 4000
if "%PORT_BUSY%"=="0" (
    echo ERROR: nothing is listening on 127.0.0.1:4000.
    echo Start start-capture-session.bat first.
    exit /b 1
)

echo Starting fxgame.exe directly...
start "Nine Yin Client Direct" /D "%FXBIN%" "%FXGAME%" %LOGIN_KEY% 0 127.0.0.1 19061 AOWPR-AOWPR 127.0.0.1 4000 0 0

echo.
echo Client process requested.
echo If fxgame opens, do NOT start fxupdate or the normal updater for this capture.
exit /b 0

:port_busy
set "PORT_BUSY=0"
for /f "tokens=*" %%L in ('netstat -ano -p tcp ^| findstr /R /C:":%~1 .*LISTENING"') do set "PORT_BUSY=1"
exit /b 0
