@echo off
setlocal
cd /d "%~dp0"

if "%~1"=="" (
    echo Usage:
    echo   pack-capture.bat captures\local\20261003-xxxxxx-client
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

if not exist "%SESSION%\analysis.txt" (
    echo analysis.txt is missing; generating it first...
    call "%~dp0analyze-capture.bat" "%SESSION%"
    if errorlevel 1 exit /b 1
)

for %%D in ("%SESSION%") do set "SESSION_NAME=%%~nxD"
set "OUT=%~dp0%SESSION_NAME%-protocol-capture.zip"

if exist "%OUT%" del /q "%OUT%"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$files=@();" ^
  "$base=[IO.Path]::GetFullPath('%SESSION%');" ^
  "foreach($n in @('c2s.bin','s2c.bin','chunks.jsonl','meta.json','analysis.txt')){" ^
  "  $p=Join-Path $base $n;" ^
  "  if(Test-Path -LiteralPath $p){$files += $p}" ^
  "};" ^
  "Compress-Archive -LiteralPath $files -DestinationPath ([IO.Path]::GetFullPath('%OUT%')) -Force"

if errorlevel 1 (
    echo ERROR: failed to create ZIP.
    exit /b 1
)

echo.
echo Capture package created:
echo   %OUT%
echo.
echo Upload this ZIP for protocol analysis.
