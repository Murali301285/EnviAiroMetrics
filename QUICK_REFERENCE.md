# 🚀 Quick Deployment Reference

## One-Time Setup

```powershell
# Install Node.js (download from nodejs.org)
# Install PM2
npm install -g pm2
npm install -g pm2-windows-service

# Install PM2 as Windows Service
pm2-service-install
```

## Deploy Backend

```powershell
cd d:\Dev\EnvAiroMetrics\server
npm install --production
pm2 start pm2.config.js
pm2 save
```

## Deploy Frontend

```powershell
cd d:\Dev\EnvAiroMetrics\client
npm install
npm run build

# Copy to IIS
Copy-Item -Path .\dist\* -Destination C:\inetpub\wwwroot\envairo -Recurse -Force
```

## Automated Deployment

```powershell
# Run as Administrator
.\deploy.ps1
```

## Common PM2 Commands

```powershell
pm2 list                        # List all processes
pm2 logs envairo-backend        # View logs
pm2 restart envairo-backend     # Restart backend
pm2 stop envairo-backend        # Stop backend
pm2 delete envairo-backend      # Remove process
pm2 save                        # Save PM2 configuration
pm2 monit                       # Monitor resources
```

## Firewall Rules

```powershell
# Backend (Port 5000)
New-NetFirewallRule -DisplayName "EnvAiro Backend" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow

# HTTP (Port 80)
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow

# HTTPS (Port 443)
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow
```

## Testing

```powershell
# Test Backend API
curl http://localhost:5000/api/admin/apps

# Test Frontend
# Open browser: http://localhost
```

## Troubleshooting

```powershell
# View Backend Logs
pm2 logs envairo-backend --lines 100

# Check Port Usage
netstat -ano | findstr :5000

# Restart Everything
pm2 restart all

# Check IIS Status
Get-Website | Where-Object {$_.Name -eq "EnvAiroMetrics"}
```

## Update Application

```powershell
# Backend Update
cd d:\Dev\EnvAiroMetrics\server
# Copy new files or git pull
npm install --production
pm2 restart envairo-backend

# Frontend Update
cd d:\Dev\EnvAiroMetrics\client
# Copy new files or git pull
npm install
npm run build
Copy-Item -Path .\dist\* -Destination C:\inetpub\wwwroot\envairo -Recurse -Force
```

## Access URLs

- **Frontend**: http://your-server-ip
- **Backend API**: http://your-server-ip:5000/api
- **Login**: admin / admin123 (CHANGE IN PRODUCTION!)

## Security Checklist

- [ ] Changed JWT_SECRET in .env
- [ ] Changed admin password
- [ ] Configured HTTPS/SSL
- [ ] Updated firewall rules
- [ ] Enabled Windows Defender exclusions
- [ ] Configured backup strategy
