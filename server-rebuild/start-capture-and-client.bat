@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

if "%~1"=="" (
    echo Usage:
    echo   start-capture-and-client.bat "D:\9yin\9yin-go-server1" "D:\AOOOW\BFAGE\AOW"
    echo.
    echo Optional third argument: captured login key
    echo   start-capture-and-client.bat "D:\9yin\9yin-go-server1" "D:\AOOOW\BFAGE\AOW" 105466859
    exit /b 2
)

if "%~2"=="" (
    echo ERROR: client root or fxgame.exe path is required.
    echo.
    echo Example:
    echo   start-capture-and-client.bat "D:\9yin\9yin-go-server1" "D:\AOOOW\BFAGE\AOW"
    exit /b 2
)

set "LEGACY_ROOT=%~1"
set "CLIENT_PATH=%~2"
set "LOGIN_KEY=105466859"
if not "%~3"=="" set "LOGIN_KEY=%~3"

echo =============================================
echo   Nine Yin capture + direct client
echo =============================================
echo.
echo Old server:
echo   %LEGACY_ROOT%
echo.
echo Client:
echo   %CLIENT_PATH%
echo.
echo fxupdate will NOT be used.
echo.

start "Nine Yin Capture Server" cmd /k call "%~dp0start-capture-session.bat" "%LEGACY_ROOT%"

echo Waiting for capture proxy on 127.0.0.1:19061 ...
for /L %%I in (1,1,40) do (
    timeout /t 1 /nobreak >nul
    call :port_busy 19061
    if "!PORT_BUSY!"=="1" goto proxy_ready
)

echo ERROR: capture proxy did not start on 19061.
echo Check the "Nine Yin Capture Server" window for the error.
exit /b 1

:proxy_ready
echo Proxy is listening.
echo.
echo Starting fxgame.exe directly...
call "%~dp0launch-fxgame-direct.bat" "%CLIENT_PATH%" "%LOGIN_KEY%"
exit /b %errorlevel%

:port_busy
set "PORT_BUSY=0"
for /f "tokens=*" %%L in ('netstat -ano -p tcp ^| findstr /R /C:":%~1 .*LISTENING"') do set "PORT_BUSY=1"
exit /b 0
