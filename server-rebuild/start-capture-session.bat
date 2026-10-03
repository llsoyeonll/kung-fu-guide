@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

if "%~1"=="" (
    echo Usage:
    echo   start-capture-session.bat D:\9yin\9yin-go-server1
    echo.
    echo The argument must be the OLD working server root.
    exit /b 2
)

set "LEGACY_ROOT=%~1"
set "LEGACY_EXE=%LEGACY_ROOT%\build\9yin-game-native-menu.exe"
set "MYSQL_ENV=%LEGACY_ROOT%\mysql.env"
set "PROXY_EXE=%~dp0build\9yin-protocol-proxy.exe"
set "MYSQL_EXE=%LEGACY_ROOT%\mysql-server\mysql-26.7.0-winx64\bin\mysqld.exe"
set "MYSQL_INI=%LEGACY_ROOT%\mysql-server\mysql-26.7.0-winx64\my.ini"
set "LISTER_PS1=%LEGACY_ROOT%\loopback-lister.ps1"

if not exist "%LEGACY_EXE%" (
    echo ERROR: old game server not found:
    echo   %LEGACY_EXE%
    exit /b 1
)

if not exist "%PROXY_EXE%" (
    echo ERROR: proxy not built:
    echo   %PROXY_EXE%
    echo Run build-tools.bat first.
    exit /b 1
)

call :port_busy 19061
if "!PORT_BUSY!"=="1" (
    echo ERROR: port 19061 is already in use.
    echo Close the currently running game server first.
    echo Nothing was terminated automatically.
    exit /b 1
)

call :port_busy 19063
if "!PORT_BUSY!"=="1" (
    echo ERROR: port 19063 is already in use.
    exit /b 1
)

call :port_busy 19064
if "!PORT_BUSY!"=="1" (
    echo ERROR: port 19064 is already in use.
    echo It is reserved for the temporary legacy GM endpoint.
    exit /b 1
)

if exist "%MYSQL_ENV%" (
    for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%MYSQL_ENV%") do (
        if /I "%%A"=="NINEYIN_MYSQL_DSN" set "NINEYIN_MYSQL_DSN=%%B"
    )
)

if not defined NINEYIN_MYSQL_DSN (
    echo WARNING: NINEYIN_MYSQL_DSN was not found in:
    echo   %MYSQL_ENV%
    echo.
    echo The old server may still work if it has another DB configuration.
    echo.
)

call :port_busy 3306
if "!PORT_BUSY!"=="0" (
    if not exist "%MYSQL_EXE%" (
        echo ERROR: MySQL is not listening on 3306 and mysqld.exe was not found:
        echo   %MYSQL_EXE%
        exit /b 1
    )
    if not exist "%MYSQL_INI%" (
        echo ERROR: MySQL config not found:
        echo   %MYSQL_INI%
        exit /b 1
    )

    echo Starting MySQL on 127.0.0.1:3306 ...
    start "Nine Yin MySQL" /D "%LEGACY_ROOT%\mysql-server\mysql-26.7.0-winx64" ^
        "%MYSQL_EXE%" --defaults-file="%MYSQL_INI%"

    echo Waiting for MySQL port 3306 ...
    for /L %%I in (1,1,30) do (
        timeout /t 1 /nobreak >nul
        call :port_busy 3306
        if "!PORT_BUSY!"=="1" goto mysql_ready
    )

    echo ERROR: MySQL did not start listening on 3306.
    exit /b 1
)

:mysql_ready
echo MySQL is listening.

call :port_busy 4000
if "!PORT_BUSY!"=="0" (
    if not exist "%LISTER_PS1%" (
        echo ERROR: server-list script not found:
        echo   %LISTER_PS1%
        exit /b 1
    )

    echo Starting server list on 127.0.0.1:4000 ...
    start "Nine Yin Server List 4000" /D "%LEGACY_ROOT%" powershell ^
        -NoProfile -ExecutionPolicy Bypass -File "%LISTER_PS1%" -Port 4000

    echo Waiting for server-list port 4000 ...
    for /L %%I in (1,1,20) do (
        timeout /t 1 /nobreak >nul
        call :port_busy 4000
        if "!PORT_BUSY!"=="1" goto lister_ready
    )

    echo ERROR: server list did not start listening on 4000.
    exit /b 1
)

:lister_ready
echo Server list is listening.

if not exist "%LEGACY_ROOT%\logs" mkdir "%LEGACY_ROOT%\logs"

echo.
echo Starting OLD reference server on 127.0.0.1:19063 ...
start "Nine Yin Legacy 19063" /D "%LEGACY_ROOT%" "%LEGACY_EXE%" ^
    -listen 127.0.0.1:19063 ^
    -gm-listen 127.0.0.1:19064 ^
    -log-file "%LEGACY_ROOT%\logs\legacy-capture-19063.log"

echo Waiting for legacy port 19063 ...
for /L %%I in (1,1,20) do (
    timeout /t 1 /nobreak >nul
    call :port_busy 19063
    if "!PORT_BUSY!"=="1" goto legacy_ready
)

echo ERROR: legacy server did not start listening on 19063.
echo Check:
echo   %LEGACY_ROOT%\logs\legacy-capture-19063.log
exit /b 1

:legacy_ready
echo Legacy server is listening.
echo.
echo Starting transparent capture proxy on 127.0.0.1:19061 ...
echo Captures will be stored under:
echo   %~dp0captures\local
echo.
echo Keep this window open while testing the game.
echo Close it with Ctrl+C after the character has entered the world.
echo.

"%PROXY_EXE%" ^
    -listen 127.0.0.1:19061 ^
    -upstream 127.0.0.1:19063 ^
    -captures "%~dp0captures\local"

exit /b %errorlevel%

:port_busy
set "PORT_BUSY=0"
for /f "tokens=*" %%L in ('netstat -ano -p tcp ^| findstr /R /C:":%~1 .*LISTENING"') do (
    set "PORT_BUSY=1"
)
exit /b 0
