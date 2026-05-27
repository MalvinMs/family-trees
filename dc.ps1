# Multi-Environment Docker Compose Helper Script for Windows PowerShell

param(
    [Parameter(Mandatory=$false, Position=0)]
    [string]$Env,
    
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$RemainingArgs
)

if ([string]::IsNullOrEmpty($Env)) {
    Write-Host "Usage: .\dc.ps1 [dev|prod] [docker-compose commands]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\dc.ps1 dev up -d"
    Write-Host "  .\dc.ps1 dev build"
    Write-Host "  .\dc.ps1 prod up -d --build"
    Write-Host "  .\dc.ps1 prod down"
    Exit
}

if ($Env -eq "dev") {
    Write-Host "🚀 Running Docker Compose in DEVELOPMENT mode..." -ForegroundColor Green
    docker compose -f docker-compose.dev.yml $RemainingArgs
} elseif ($Env -eq "prod") {
    Write-Host "🔒 Running Docker Compose in PRODUCTION mode (backend-only)..." -ForegroundColor Cyan
    docker compose -f docker-compose.prod.yml $RemainingArgs
} else {
    Write-Host "❌ Unknown environment: $Env" -ForegroundColor Red
    Write-Host "Use either 'dev' or 'prod'." -ForegroundColor Red
    Exit
}
