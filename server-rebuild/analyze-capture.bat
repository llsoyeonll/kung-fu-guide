@echo off
setlocal
cd /d "%~dp0"

if "%~1"=="" (
    echo Usage:
    echo   analyze-capture.bat captures\local\20261003-xxxxxx-client
    exit /b 2
)

set "SESSION=%~1"

if not exist "%SESSION%\c2s.bin" (
    echo ERROR: missing %SESSION%\c2s.bin
    exit /b 1
)

if not exist "%SESSION%\s2c.bin" (
    echo ERROR: missing %SESSION%\s2c.bin
    exit /b 1
)

if not exist "build\9yin-capture-inspect.exe" (
    echo ERROR: build\9yin-capture-inspect.exe not found.
    echo Run build-tools.bat first.
    exit /b 1
)

if not exist "build\9yin-frame-scan.exe" (
    echo ERROR: build\9yin-frame-scan.exe not found.
    echo Run build-tools.bat first.
    exit /b 1
)

set "OUT=%SESSION%\analysis.txt"

(
    echo ============================================================
    echo CLIENT TO SERVER
    echo ============================================================
    build\9yin-capture-inspect.exe -file "%SESSION%\c2s.bin"
    echo.
    echo ============================================================
    echo CLIENT TO SERVER - FRAME HYPOTHESES
    echo ============================================================
    build\9yin-frame-scan.exe -file "%SESSION%\c2s.bin" -top 40
    echo.
    echo ============================================================
    echo SERVER TO CLIENT
    echo ============================================================
    build\9yin-capture-inspect.exe -file "%SESSION%\s2c.bin"
    echo.
    echo ============================================================
    echo SERVER TO CLIENT - FRAME HYPOTHESES
    echo ============================================================
    build\9yin-frame-scan.exe -file "%SESSION%\s2c.bin" -top 40
) > "%OUT%" 2>&1

echo Analysis written to:
echo   %OUT%
echo.
type "%OUT%"
