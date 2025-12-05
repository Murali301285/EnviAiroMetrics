# EnvAiroMetrics - Windows Server Deployment Script
# Run this script with Administrator privileges

Write-Host "======================================"  -ForegroundColor Cyan
Write-Host " EnvAiroMetrics Deployment Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$BackendPath = "d:\Dev\EnvAiroMetrics\server"
$FrontendPath = "d:\Dev\EnvAiroMetrics\client"
$IISPath = "C:\inetpub\wwwroot\envairo"

# Step 1: Deploy Backend
Write-Host "[1/5] Deploying Backend..." -ForegroundColor Yellow
cd $BackendPath

# Install dependencies
Write-Host "  Installing backend dependencies..." -ForegroundColor Gray
npm install --production

# Create logs directory
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Force -Path "logs" | Out-Null
    Write-Host "  Created logs directory" -ForegroundColor Green
}

# Stop existing PM2 process
Write-Host "  Stopping existing backend process..." -ForegroundColor Gray
pm2 stop envairo-backend 2>$null

# Start with PM2
Write-Host "  Starting backend with PM2..." -ForegroundColor Gray
pm2 start pm2.config.js
pm2 save

Write-Host "  ✓ Backend deployed successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Build Frontend
Write-Host "[2/5] Building Frontend..." -ForegroundColor Yellow
cd $FrontendPath

# Install dependencies
Write-Host "  Installing frontend dependencies..." -ForegroundColor Gray
npm install

# Build production bundle
Write-Host "  Building production bundle..." -ForegroundColor Gray
npm run build

Write-Host "  ✓ Frontend built successfully!" -ForegroundColor Green
Write-Host ""

# Step 3: Deploy to IIS
Write-Host "[3/5] Deploying Frontend to IIS..." -ForegroundColor Yellow

# Create IIS directory
if (-not (Test-Path $IISPath)) {
    New-Item -ItemType Directory -Force -Path $IISPath | Out-Null
    Write-Host "  Created IIS directory" -ForegroundColor Green
}

# Copy build files
Write-Host "  Copying build files..." -ForegroundColor Gray
Copy-Item -Path "$FrontendPath\dist\*" -Destination $IISPath -Recurse -Force

# Copy web.config
if (Test-Path "$FrontendPath\public\web.config") {
    Copy-Item -Path "$FrontendPath\public\web.config" -Destination $IISPath -Force
    Write-Host "  Copied web.config" -ForegroundColor Green
}

Write-Host "  ✓ Frontend deployed to IIS!" -ForegroundColor Green
Write-Host ""

# Step 4: Configure Firewall
Write-Host "[4/5] Configuring Windows Firewall..." -ForegroundColor Yellow

# Check and add firewall rules
$rules = @(
    @{Name="EnvAiro Backend"; Port=5000},
    @{Name="HTTP"; Port=80},
    @{Name="HTTPS"; Port=443}
)

foreach ($rule in $rules) {
    $existing = Get-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue
    if (-not $existing) {
        New-NetFirewallRule -DisplayName $rule.Name -Direction Inbound -LocalPort $rule.Port -Protocol TCP -Action Allow | Out-Null
        Write-Host "  Added firewall rule for port $($rule.Port)" -ForegroundColor Green
    } else {
        Write-Host "  Firewall rule for port $($rule.Port) already exists" -ForegroundColor Gray
    }
}

Write-Host "  ✓ Firewall configured!" -ForegroundColor Green
Write-Host ""

# Step 5: Verify Deployment
Write-Host "[5/5] Verifying Deployment..." -ForegroundColor Yellow

# Check PM2 status
$pm2Status = pm2 list | Select-String "envairo-backend"
if ($pm2Status) {
    Write-Host "  ✓ Backend is running" -ForegroundColor Green
} else {
    Write-Host "  ✗ Backend is NOT running!" -ForegroundColor Red
}

# Check IIS files
$indexExists = Test-Path "$IISPath\index.html"
if ($indexExists) {
    Write-Host "  ✓ Frontend files deployed" -ForegroundColor Green
} else {
    Write-Host "  ✗ Frontend files missing!" -ForegroundColor Red
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Deployment Complete!" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Configure IIS website (if not already done)" -ForegroundColor White
Write-Host "2. Update .env with production values" -ForegroundColor White
Write-Host "3. Change JWT_SECRET in .env" -ForegroundColor White
Write-Host "4. Test application:" -ForegroundColor White
Write-Host "   - Backend: http://localhost:5000/api/admin/apps" -ForegroundColor Gray
Write-Host "   - Frontend: http://localhost" -ForegroundColor Gray
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor Yellow
Write-Host "  pm2 status          - Check backend status" -ForegroundColor Gray
Write-Host "  pm2 logs            - View backend logs" -ForegroundColor Gray
Write-Host "  pm2 restart all     - Restart backend" -ForegroundColor Gray
Write-Host ""
