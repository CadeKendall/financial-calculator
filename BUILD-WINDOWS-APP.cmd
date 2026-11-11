@echo off
:: Builds the Windows desktop app (installer + portable .exe) into desktop\release.
cd /d "%~dp0"
if not exist "node_modules\esbuild" (
  echo Installing calculator dependencies...
  call npm ci
  if errorlevel 1 goto failed
)
cd desktop
if not exist "node_modules\electron" (
  echo Installing desktop app tools. This downloads Electron the first time...
  call npm ci
  if errorlevel 1 goto failed
)
echo Building Financial Calculator for Windows...
call npm run dist
if errorlevel 1 goto failed
echo.
echo Done. Run FinancialCalculator-Setup.exe to install it,
echo or use FinancialCalculator-Portable.exe without installing.
start "" explorer.exe "%~dp0desktop\release"
pause
exit /b
:failed
echo Build failed. Make sure Node.js is installed, then read the message above.
pause
exit /b 1
