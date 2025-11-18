@echo off
cd /d "%~dp0"
echo Starting local Python web server on port 8000...
start "" "http://localhost:8000/index.html"
python -m http.server 8000
pause
