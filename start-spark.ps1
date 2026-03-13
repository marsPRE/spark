# SPARKS Start Script
Write-Host "🎮 Starting SPARKS..." -ForegroundColor Yellow

cd $PSScriptRoot

# Check if node_modules exists
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies first..." -ForegroundColor Cyan
    npm install
}

Write-Host "🚀 Starting development server..." -ForegroundColor Green
Write-Host "📍 Open http://localhost:3000 in your browser" -ForegroundColor Cyan
Write-Host ""

npm run dev

Write-Host ""
Read-Host "Press Enter to exit"
