@echo off
cd /d "%~dp0frontend"
if not exist node_modules (
  echo Installing frontend dependencies...
  call npm install
)
echo Starting Parsify AI frontend on http://localhost:5173
npm run dev
