# EnvAiroMetrics - Windows Server Deployment Guide

## 📋 Prerequisites

### Required Software
1. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version` and `npm --version`

2. **PM2** (Process Manager)
   - Install globally: `npm install -g pm2`
   - For Windows Service: `npm install -g pm2-windows-service`

3. **IIS (Internet Information Services)** - Optional, for frontend hosting
   - Enable via: Server Manager → Add Roles and Features → Web Server (IIS)
   - Alternative: Use nginx or serve with Node.js

4. **URL Rewrite Module for IIS** (if using IIS)
   - Download: https://www.iis.net/downloads/microsoft/url-rewrite

---

## 🔧 BACKEND DEPLOYMENT

### Step 1: Prepare Backend Files

1. **Navigate to server directory:**
   ```powershell
   cd d:\Dev\EnvAiroMetrics\server
   ```

2. **Install production dependencies:**
   ```powershell
   npm install --production
   ```

3. **Verify .env file exists and is configured:**
   ```powershell
   # Check if .env exists
   if (Test-Path .env) { Write-Host "✓ .env file found" } else { Write-Host "✗ .env file missing!" }
   ```

4. **Update .env for production:**
   ```env
   # Database Configuration
   DB_HOST=97.74.92.23
   DB_USER=root
   DB_PASSWORD=your_password_here
   DB_NAME=env_admin

   # JWT Secret (IMPORTANT: Change this!)
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

   # Server Port
   PORT=5000

   # Node Environment
   NODE_ENV=production
   ```

### Step 2: Test Backend Locally

```powershell
# Test the server starts correctly
node index.js
```

Press `Ctrl+C` to stop after verifying it works.

### Step 3: Deploy with PM2

**Option A: Using PM2 (Recommended)**

1. **Create PM2 ecosystem file:**
   ```powershell
   # Create pm2.config.js in server directory
   ```

   **Content for `pm2.config.js`:**
   ```javascript
   module.exports = {
     apps: [{
       name: 'envairo-backend',
       script: './index.js',
       instances: 1,
       autorestart: true,
       watch: false,
       max_memory_restart: '1G',
       env: {
         NODE_ENV: 'production',
         PORT: 5000
       },
       error_file: './logs/err.log',
       out_file: './logs/out.log',
       log_file: './logs/combined.log',
       time: true
     }]
   };
   ```

2. **Create logs directory:**
   ```powershell
   New-Item -ItemType Directory -Force -Path logs
   ```

3. **Start with PM2:**
   ```powershell
   pm2 start pm2.config.js
   ```

4. **Save PM2 configuration:**
   ```powershell
   pm2 save
   ```

5. **Set PM2 to start on Windows boot:**
   ```powershell
   pm2 startup
   # Follow the displayed command
   ```

**Option B: Using PM2 as Windows Service**

1. **Install PM2 Windows Service:**
   ```powershell
   npm install -g pm2-windows-service
   pm2-service-install
   ```

2. **Configure service:**
   - Service Name: `PM2`
   - PM2_HOME: `C:\ProgramData\pm2\home`

3. **Start service:**
   ```powershell
   Start-Service PM2
   ```

### Step 4: Configure Windows Firewall

```powershell
# Allow port 5000 for backend
New-NetFirewallRule -DisplayName "EnvAiro Backend" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

### Step 5: Verify Backend is Running

```powershell
# Check PM2 status
pm2 status

# Check logs
pm2 logs envairo-backend

# Test API
curl http://localhost:5000/api/admin/apps
```

---

## 🎨 FRONTEND DEPLOYMENT

### Step 1: Build Frontend for Production

1. **Navigate to client directory:**
   ```powershell
   cd d:\Dev\EnvAiroMetrics\client
   ```

2. **Install dependencies (if not already):**
   ```powershell
   npm install
   ```

3. **Update API base URL for production:**
   
   Edit `client/src/main.jsx` or create `client/.env.production`:
   ```env
   VITE_API_URL=http://your-server-ip:5000
   ```

4. **Build production bundle:**
   ```powershell
   npm run build
   ```

   This creates a `dist` folder with optimized static files.

### Step 2: Deploy Frontend

**Option A: Host with IIS (Recommended for Windows Server)**

1. **Copy dist folder to IIS directory:**
   ```powershell
   # Create website directory
   New-Item -ItemType Directory -Force -Path C:\inetpub\wwwroot\envairo

   # Copy build files
   Copy-Item -Path .\dist\* -Destination C:\inetpub\wwwroot\envairo -Recurse -Force
   ```

2. **Create IIS Website:**
   - Open **IIS Manager**
   - Right-click **Sites** → **Add Website**
   - Site name: `EnvAiroMetrics`
   - Physical path: `C:\inetpub\wwwroot\envairo`
   - Port: `80` (or `443` for HTTPS)
   - Click **OK**

3. **Configure URL Rewrite (for React Router):**
   
   Create `web.config` in `C:\inetpub\wwwroot\envairo`:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <configuration>
     <system.webServer>
       <rewrite>
         <rules>
           <rule name="React Routes" stopProcessing="true">
             <match url=".*" />
             <conditions logicalGrouping="MatchAll">
               <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
               <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
             </conditions>
             <action type="Rewrite" url="/" />
           </rule>
         </rules>
       </rewrite>
       <staticContent>
         <mimeMap fileExtension=".json" mimeType="application/json" />
       </staticContent>
     </system.webServer>
   </configuration>
   ```

4. **Configure CORS in Backend:**
   
   Update `server/index.js` to allow your frontend domain:
   ```javascript
   const cors = require('cors');
   
   app.use(cors({
     origin: ['http://your-server-ip', 'http://your-domain.com'],
     credentials: true
   }));
   ```

5. **Configure Firewall for HTTP/HTTPS:**
   ```powershell
   # Allow HTTP (port 80)
   New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow

   # Allow HTTPS (port 443)
   New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow
   ```

**Option B: Serve with Node.js (Simple Alternative)**

1. **Install serve globally:**
   ```powershell
   npm install -g serve
   ```

2. **Create PM2 config for frontend:**
   
   Create `pm2.frontend.config.js`:
   ```javascript
   module.exports = {
     apps: [{
       name: 'envairo-frontend',
       script: 'serve',
       args: '-s dist -l 3000',
       cwd: 'd:/Dev/EnvAiroMetrics/client',
       instances: 1,
       autorestart: true,
       watch: false
     }]
   };
   ```

3. **Start frontend with PM2:**
   ```powershell
   cd d:\Dev\EnvAiroMetrics\client
   pm2 start pm2.frontend.config.js
   pm2 save
   ```

4. **Allow port 3000:**
   ```powershell
   New-NetFirewallRule -DisplayName "EnvAiro Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```

---

## 🔒 SECURITY HARDENING

### 1. Change Default Credentials
```sql
-- Connect to env_admin database
UPDATE users SET password = 'new_bcrypt_hash' WHERE username = 'admin';
```

### 2. Update JWT Secret
Update `.env`:
```env
JWT_SECRET=use_a_very_strong_random_secret_here_min_32_chars
```

### 3. Enable HTTPS (SSL/TLS)

**For IIS:**
1. Obtain SSL certificate (Let's Encrypt, commercial CA)
2. Import certificate to IIS
3. Bind HTTPS (port 443) to website
4. Force HTTPS redirect

**For nginx (if using):**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        root C:/inetpub/wwwroot/envairo;
        try_files $uri /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Configure Windows Defender/Antivirus
Add exclusions for:
- `d:\Dev\EnvAiroMetrics`
- `C:\inetpub\wwwroot\envairo`
- Node.js executable

---

## 📊 MONITORING & MAINTENANCE

### PM2 Commands

```powershell
# View all processes
pm2 list

# View logs
pm2 logs envairo-backend
pm2 logs envairo-frontend

# Restart services
pm2 restart envairo-backend
pm2 restart envairo-frontend

# Stop services
pm2 stop envairo-backend

# Monitor resources
pm2 monit

# View detailed info
pm2 show envairo-backend
```

### Update Application

**Backend Update:**
```powershell
cd d:\Dev\EnvAiroMetrics\server
git pull  # or manual file copy
npm install --production
pm2 restart envairo-backend
```

**Frontend Update:**
```powershell
cd d:\Dev\EnvAiroMetrics\client
git pull  # or manual file copy
npm install
npm run build

# If using IIS:
Copy-Item -Path .\dist\* -Destination C:\inetpub\wwwroot\envairo -Recurse -Force

# If using serve:
pm2 restart envairo-frontend
```

---

## 🧪 TESTING DEPLOYMENT

### 1. Test Backend
```powershell
# From server or another machine
curl http://your-server-ip:5000/api/admin/apps
```

### 2. Test Frontend
- Open browser: `http://your-server-ip` (or your domain)
- Login with: `admin` / `admin123`
- Navigate through all pages
- Test dashboard data loading
- Test Excel/PNG downloads

### 3. Test API Integration
- Check browser console for errors
- Verify API calls to backend succeed
- Test all CRUD operations

---

## 🆘 TROUBLESHOOTING

### Backend Not Starting
```powershell
# Check PM2 logs
pm2 logs envairo-backend --err

# Check port availability
netstat -ano | findstr :5000

# Test node directly
cd d:\Dev\EnvAiroMetrics\server
node index.js
```

### Frontend Not Loading
1. Check IIS application pool is running
2. Verify `web.config` exists
3. Check browser console for errors
4. Verify API URL is correct

### Database Connection Issues
1. Verify MySQL is accessible from server
2. Check `.env` credentials
3. Test connection:
   ```powershell
   mysql -h 97.74.92.23 -u root -p
   ```

### CORS Errors
- Update backend `cors` configuration
- Verify frontend API URL matches backend URL

---

## 📝 PRODUCTION CHECKLIST

- [ ] Node.js installed
- [ ] PM2 installed and configured
- [ ] Backend `.env` configured with production values
- [ ] JWT_SECRET changed from default
- [ ] Backend running via PM2
- [ ] PM2 configured to start on boot
- [ ] Frontend built (`npm run build`)
- [ ] Frontend deployed to IIS or serve
- [ ] `web.config` created for React routing
- [ ] Firewall rules configured
- [ ] CORS configured in backend
- [ ] Database accessible
- [ ] HTTPS/SSL configured (recommended)
- [ ] Tested all functionality
- [ ] Monitoring/logging configured
- [ ] Backup strategy implemented

---

## 🎯 ACCESS URLs

After deployment:

- **Frontend**: `http://your-server-ip`or `https://your-domain.com`
- **Backend API**: `http://your-server-ip:5000/api`
- **Health Check**: `http://your-server-ip:5000/api/admin/apps`

---

## 📞 SUPPORT

For issues:
1. Check PM2 logs: `pm2 logs`
2. Check IIS logs: `C:\inetpub\logs\LogFiles`
3. Review this guide's Troubleshooting section

---

**Deployment Date**: 2025-12-05  
**Version**: 1.0  
**Last Updated**: 2025-12-05
