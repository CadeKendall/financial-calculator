@echo off
cd /d "%~dp0"
if not exist "node_modules\decimal.js\decimal.mjs" (
  echo Installing the calculator dependency...
  call npm ci
  if errorlevel 1 goto failed
)
if not exist "dist\index.js" (
  echo Building the calculator engine...
  call npm run build
  if errorlevel 1 goto failed
)
node scripts/serve.mjs --open
if errorlevel 1 goto failed
exit /b
:failed
echo Could not start. Make sure Node.js is installed, then try again.
pause
