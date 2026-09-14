$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".venv\Scripts\python.exe")) {
    py -3.12 -m venv .venv
}

& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt
& .\.venv\Scripts\python.exe -c "import sqlalchemy; print('SQLAlchemy', sqlalchemy.__version__)"

Write-Host ""
Write-Host "Setup selesai. Jalankan:" -ForegroundColor Green
Write-Host ".\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload"
Write-Host "Pastikan ffmpeg tersedia: ffmpeg -version"
