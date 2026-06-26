@echo off
cd /d "%~dp0backend"
if not exist venv (
  echo Creating Python virtual environment...
  python -m venv venv
)
call venv\Scripts\activate.bat
pip install -r requirements.txt
echo Starting Parsify AI backend on http://localhost:8000
uvicorn main:app --reload --port 8000
