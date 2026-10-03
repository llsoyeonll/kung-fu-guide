@echo off
setlocal
cd /d "%~dp0"

echo =========================================
echo  Nine Yin server rebuild - build tools
echo =========================================
echo.

echo [1/4] Tests
go test ./...
if errorlevel 1 goto :error

if not exist build mkdir build

echo.
echo [2/4] Capture proxy
go build -trimpath -o build\9yin-protocol-proxy.exe .\cmd\protocol-probe
if errorlevel 1 goto :error

echo.
echo [3/4] Capture inspector
go build -trimpath -o build\9yin-capture-inspect.exe .\cmd\capture-inspect
if errorlevel 1 goto :error

echo.
echo [4/4] Frame scanner
go build -trimpath -o build\9yin-frame-scan.exe .\cmd\frame-scan
if errorlevel 1 goto :error

echo.
echo SUCCESS
echo   build\9yin-protocol-proxy.exe
echo   build\9yin-capture-inspect.exe
echo   build\9yin-frame-scan.exe
exit /b 0

:error
echo.
echo BUILD FAILED
exit /b 1
