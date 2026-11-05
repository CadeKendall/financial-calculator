@echo off
cd /d "%~dp0mobile"
if not exist node_modules (
  call npm ci
  if errorlevel 1 goto failed
)
echo Checking Expo sign-in. Use the same account as Expo Go on your iPhone.
call npx expo whoami
if errorlevel 1 (
  echo Open the sign-in link printed below in your computer browser.
  set "BROWSER=none"
  call npx expo login --browser
  if errorlevel 1 goto failed
)
call npm start
pause
exit /b
:failed
echo Setup did not finish. See the message above, then run this launcher again.
pause
exit /b 1

