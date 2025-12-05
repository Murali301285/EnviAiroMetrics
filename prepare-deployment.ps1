# Prepare Deployment Package Script
# Run this on your DEVELOPMENT machine to prepare files for server

Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Preparing Deployment Package" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$SOURCE = "d:\Dev\EnvAiroMetrics"
$PACKAGE = "d:\DeploymentPackage\EnvAiroMetrics"

# Create package directory
Write-Host "[1/4] Creating package directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $PACKAGE | Out-Null
Write-Host "  Created: $PACKAGE" -ForegroundColor Green

# Copy Backend (exclude node_modules, logs, .git)
Write-Host ""
Write-Host "[2/4] Copying backend files..." -ForegroundColor Yellow
Copy-Item -Path "$SOURCE\server" -Destination "$PACKAGE\" -Recurse -Force -Exclude @('node_modules','logs','.git','*.log')
Write-Host "  ✓ Backend copied (without node_modules)" -ForegroundColor Green

# Build and copy Frontend
Write-Host ""
Write-Host "[3/4] Building frontend..." -ForegroundColor Yellow
Set-Location "$SOURCE\client"
npm run build
Write-Host "  ✓ Frontend built" -ForegroundColor Green

Write-Host "  Copying frontend dist..." -ForegroundColor Gray
New-Item -ItemType Directory -Force -Path "$PACKAGE\client" | Out-Null
Copy-Item -Path "$SOURCE\client\dist" -Destination "$PACKAGE\client\" -Recurse -Force
Write-Host "  ✓ Frontend dist copied" -ForegroundColor Green

# Copy deployment guides
Write-Host ""
Write-Host "[4/4] Copying deployment guides..." -ForegroundColor Yellow
Copy-Item -Path "$SOURCE\DEPLOYMENT_CUSTOM_PORTS.md" -Destination "$PACKAGE\" -Force
Copy-Item -Path "$SOURCE\QUICK_REFERENCE.md" -Destination "$PACKAGE\" -Force
Write-Host "  ✓ Documentation copied" -ForegroundColor Green

# Create README
Write-Host ""
Write-Host "Creating deployment README..." -ForegroundColor Yellow
@"
# EnvAiroMetrics Deployment Package

## Contents
- server/          (Backend source code - needs npm install)
- client/dist/     (Frontend built files - ready to serve)
- DEPLOYMENT_CUSTOM_PORTS.md  (Complete deployment guide)
- QUICK_REFERENCE.md           (Quick commands reference)

## Quick Start on Server

### 1. Install Backend
``````powershell
cd C:\Apps\EnvAiroMetrics\server
npm install --production
pm2 start pm2.config.js
pm2 save
``````

### 2. Deploy Frontend to IIS
- Physical path: C:\Apps\EnvAiroMetrics\client\dist
- Port: 8481

### 3. Configure Firewall
``````powershell
New-NetFirewallRule -DisplayName "EnvAiro API" -LocalPort 8480 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "EnvAiro Web" -LocalPort 8481 -Protocol TCP -Action Allow
``````

## Access
- Frontend: http://YOUR_SERVER_IP:8481
- Backend: http://YOUR_SERVER_IP:8480/api

See DEPLOYMENT_CUSTOM_PORTS.md for detailed instructions.
"@ | Out-File -FilePath "$PACKAGE\README.txt" -Encoding UTF8

Write-Host "  ✓ README created" -ForegroundColor Green

# Calculate size
Write-Host ""
Write-Host "Calculating package size..." -ForegroundColor Yellow
$size = (Get-ChildItem $PACKAGE -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "  Package size: $([Math]::Round($size, 2)) MB" -ForegroundColor Cyan

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Package Ready!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Package location: $PACKAGE" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor White
Write-Host "1. Copy the entire folder to your Windows Server" -ForegroundColor Gray
Write-Host "   Location: $PACKAGE" -ForegroundColor Gray
Write-Host ""
Write-Host "2. On the server, run:" -ForegroundColor Gray
Write-Host "   cd C:\Apps\EnvAiroMetrics\server" -ForegroundColor Gray
Write-Host "   npm install --production" -ForegroundColor Gray
Write-Host "   pm2 start pm2.config.js" -ForegroundColor Gray
Write-Host ""
Write-Host "3. See README.txt in the package for details" -ForegroundColor Gray
Write-Host ""
