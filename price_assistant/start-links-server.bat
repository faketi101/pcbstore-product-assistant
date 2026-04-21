@echo off
setlocal enabledelayedexpansion
title Retail Price Assistant

cd /d "%~dp0"

:: ── Read PORT and HOST from config.json ──────────────────────────────────────
for /f "usebackq delims=" %%P in (
  `powershell -NoProfile -Command "(Get-Content config.json | ConvertFrom-Json).PORT"`
) do set PORT=%%P
if not defined PORT set PORT=4070

for /f "usebackq delims=" %%H in (
  `powershell -NoProfile -Command "(Get-Content config.json | ConvertFrom-Json).HOST"`
) do set HOST=%%H
if not defined HOST set HOST=localhost

:: When HOST is 0.0.0.0, the server listens on ALL interfaces.
:: We still open the browser with localhost since 0.0.0.0 is not a valid browser address.
set BIND_HOST=%HOST%
set BROWSER_HOST=%HOST%
if "%HOST%"=="0.0.0.0" set BROWSER_HOST=localhost

set BASE_URL=http://%BROWSER_HOST%:%PORT%

:: ── Check Node.js ─────────────────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo  [ERROR] Node.js is not installed or not in PATH.
  echo          Install from https://nodejs.org/en/download
  echo.
  pause
  exit /b 1
)

:: ── Check if server is already running ────────────────────────────────────────
powershell -NoProfile -Command ^
  "try { $c = New-Object Net.Sockets.TcpClient('%BROWSER_HOST%',%PORT%); $c.Close(); exit 0 } catch { exit 1 }" ^
  >nul 2>&1
if not errorlevel 1 (
  echo.
  echo  [INFO] Server already running at %BASE_URL%
  echo         Opening browser...
  echo.
  start "" "%BASE_URL%/priceAnalyzer.html"
  exit /b 0
)

:: ── Start server in a separate window ─────────────────────────────────────────
echo.
echo  Starting Retail Price Assistant Server...
if "%HOST%"=="0.0.0.0" (
  echo  Binding to ALL interfaces ^(LAN + localhost^) on port %PORT%
) else (
  echo  Binding to %HOST%:%PORT%
)
echo.

start "Retail Server :%PORT%" cmd /k "cd /d "%~dp0" && node linksApiServer.js"

:: ── Wait until port is ready (up to 15s) ─────────────────────────────────────
set /a TRIES=0
:waitloop
  set /a TRIES+=1
  if %TRIES% gtr 30 goto :timeout_err
  timeout /t 1 /nobreak >nul
  powershell -NoProfile -Command ^
    "try { $c = New-Object Net.Sockets.TcpClient('%BROWSER_HOST%',%PORT%); $c.Close(); exit 0 } catch { exit 1 }" ^
    >nul 2>&1
  if errorlevel 1 goto :waitloop

:: ── Open browser ──────────────────────────────────────────────────────────────
echo  Server is ready! Opening Price Analyzer...
start "" "%BASE_URL%/priceAnalyzer.html"

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║         Retail Price Assistant is running                   ║
echo  ╠══════════════════════════════════════════════════════════╣
echo  ║  Price Analyzer : %BASE_URL%/priceAnalyzer.html
echo  ║  Product Viewer : %BASE_URL%/outputViewer.html
if "%HOST%"=="0.0.0.0" (
  echo  ║  LAN Access     : http://^<your-lan-ip^>:%PORT%/priceAnalyzer.html
)
echo  ╠══════════════════════════════════════════════════════════╣
echo  ║  Close the "Price Server" window to stop the server.      ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.
echo  Press any key to exit this launcher (server keeps running)...
pause >nul
goto :end

:timeout_err
echo.
echo  [ERROR] Server did not respond within 15 seconds.
echo          Check the "Price Server" window for error messages.
echo.
pause

:end
endlocal
