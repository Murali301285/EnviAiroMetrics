# 🚀 Custom Port Deployment Guide (8480/8481)

## Configuration Summary
- **Backend API**: Port 8480
- **Frontend**: Port 8481

---

## ✅ YES - You Need to Copy Source Code

### Backend (Port 8480)
**What to copy**: Entire `server` folder
**Why**: Node.js runs the actual source code files

### Frontend (Port 8481)  
**What to copy**: Two options:
- **Option A** (Recommended): Only the `dist` folder (after building locally)
- **Option B**: Entire `client` folder (to build on server)

---

## 📦 Step-by-Step Deployment

### Phase 1: Prepare on Your Dev Machine

#### 1.1 Build Frontend (Dev Machine)
```powershell
cd d:\Dev\EnvAiroMetrics\client
npm install
npm run build
```
This creates the `dist` folder with optimized files.

#### 1.2 Package Files for Server
Create these folders to copy:
```
EnvAiroMetrics/
├── server/              (entire folder)
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── config/
│   ├── index.js
│   ├── package.json
│   ├── pm2.config.js
│   └── .env
└── client/
    └── dist/           (only this folder)
```

---

### Phase 2: Copy to Windows Server

#### 2.1 Copy Backend Files
```powershell
# On Windows Server, create directory
New-Item -ItemType Directory -Force -Path "C:\Apps\EnvAiroMetrics\server"

# Copy from your dev machine to server
# Use File Explorer, FTP, or:
Copy-Item -Path "d:\Dev\EnvAiroMetrics\server\*" -Destination "C:\Apps\EnvAiroMetrics\server" -Recurse
```

#### 2.2 Copy Frontend Build
```powershell
# On Windows Server
New-Item -ItemType Directory -Force -Path "C:\Apps\EnvAiroMetrics\client\dist"

# Copy dist folder
Copy-Item -Path "d:\Dev\EnvAiroMetrics\client\dist\*" -Destination "C:\Apps\EnvAiroMetrics\client\dist" -Recurse
```

---

### Phase 3: Install Backend on Server

#### 3.1 Install Dependencies
```powershell
# On Windows Server
cd C:\Apps\EnvAiroMetrics\server

# Install production dependencies (downloads node_modules)
npm install --production
```

This downloads all required packages (~50-100MB).

#### 3.2 Start with PM2
```powershell
# Still in C:\Apps\EnvAiroMetrics\server
pm2 start pm2.config.js
pm2 save
pm2 startup
```

#### 3.3 Verify Backend is Running
```powershell
# Check status
pm2 status

# Test API
curl http://localhost:8480/api/admin/apps
```

---

### Phase 4: Deploy Frontend on Server

#### Option A: Using IIS (Port 8481)

**4A.1 Create IIS Website**
1. Open **IIS Manager**
2. Right-click **Sites** → **Add Website**
3. Configure:
   - **Site name**: EnvAiroMetrics
   - **Physical path**: `C:\Apps\EnvAiroMetrics\client\dist`
   - **Port**: 8481
   - Click **OK**

**4A.2 Configure API Proxy in IIS**

Install **Application Request Routing (ARR)** and **URL Rewrite** in IIS.

Update `C:\Apps\EnvAiroMetrics\client\dist\web.config`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <!-- API Reverse Proxy -->
    <rewrite>
      <rules>
        <!-- Proxy API calls to backend -->
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:8480/api/{R:1}" />
        </rule>
        
        <!-- React Router - SPA fallback -->
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
  </system.webServer>
</configuration>
```

#### Option B: Using Node.js Serve (Port 8481)

**4B.1 Install serve globally**
```powershell
npm install -g serve
```

**4B.2 Create PM2 config** (`C:\Apps\EnvAiroMetrics\frontend.pm2.config.js`):
```javascript
module.exports = {
  apps: [{
    name: 'envairo-frontend',
    script: 'serve',
    args: '-s C:\\Apps\\EnvAiroMetrics\\client\\dist -l 8481 -p /api=http://localhost:8480/api',
    instances: 1,
    autorestart: true
  }]
};
```

**4B.3 Start with PM2**
```powershell
pm2 start C:\Apps\EnvAiroMetrics\frontend.pm2.config.js
pm2 save
```

---

### Phase 5: Configure Firewall

```powershell
# Allow Backend (8480)
New-NetFirewallRule -DisplayName "EnvAiro API" -Direction Inbound -LocalPort 8480 -Protocol TCP -Action Allow

# Allow Frontend (8481)
New-NetFirewallRule -DisplayName "EnvAiro Web" -Direction Inbound -LocalPort 8481 -Protocol TCP -Action Allow
```

---

## 🧪 Testing

### Test Backend
```powershell
# From server
curl http://localhost:8480/api/admin/apps

# From another computer
curl http://YOUR_SERVER_IP:8480/api/admin/apps
```

### Test Frontend
- Open browser: `http://YOUR_SERVER_IP:8481`
- Login: admin / admin123
- Test all features

---

## 📁 Final Server Directory Structure

```
C:\Apps\EnvAiroMetrics\
├── server/
│   ├── node_modules/      (Created by npm install)
│   ├── logs/              (Created by PM2)
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── config/
│   ├── index.js
│   ├── package.json
│   ├── pm2.config.js
│   └── .env              (PORT=8480)
│
└── client/
    └── dist/             (Built files only)
        ├── index.html
        ├── assets/
        └── web.config
```

---

## 🔄 Updating the Application

### Update Backend
```powershell
# Copy new server files to C:\Apps\EnvAiroMetrics\server
# Then:
cd C:\Apps\EnvAiroMetrics\server
npm install --production
pm2 restart envairo-backend
```

### Update Frontend
```powershell
# Build on dev machine:
cd d:\Dev\EnvAiroMetrics\client
npm run build

# Copy dist to server:
Copy-Item -Path .\dist\* -Destination "\\SERVER\C$\Apps\EnvAiroMetrics\client\dist" -Recurse -Force

# If using serve with PM2:
pm2 restart envairo-frontend
```

---

## ❓ FAQ

**Q: Do I copy node_modules?**
- **Backend**: NO - Run `npm install` on server
- **Frontend**: N/A - You only copy the built `dist` folder

**Q: Can I use different paths?**
- YES - Just update all references to `C:\Apps\EnvAiroMetrics`

**Q: How much disk space needed?**
- **Backend**: ~150MB (including node_modules)
- **Frontend**: ~5-10MB (dist folder only)

**Q: Need Node.js on server?**
- YES - For running backend with PM2
- OPTIONAL - If using Option B for frontend

---

## 🎯 Quick Copy Commands

From **Development Machine**:
```powershell
# Create package (run on dev machine)
$SOURCE = "d:\Dev\EnvAiroMetrics"
$DEST = "\\YOUR_SERVER\C$\Apps\EnvAiroMetrics"

# Copy backend
Copy-Item -Path "$SOURCE\server" -Destination "$DEST\" -Recurse -Force -Exclude node_modules,logs,.git

# Copy frontend dist
New-Item -ItemType Directory -Force -Path "$DEST\client"
Copy-Item -Path "$SOURCE\client\dist" -Destination "$DEST\client\" -Recurse -Force
```

On **Server**:
```powershell
cd C:\Apps\EnvAiroMetrics\server
npm install --production
pm2 start pm2.config.js
pm2 save
```

---

## ✅ Deployment Checklist

- [ ] Node.js & PM2 installed on server
- [ ] Created `C:\Apps\EnvAiroMetrics` directory
- [ ] Copied `server` folder (without node_modules)
- [ ] Copied `client\dist` folder
- [ ] Ran `npm install --production` in server folder
- [ ] Updated `.env` with PORT=8480
- [ ] Started backend with PM2
- [ ] Configured IIS or serve for frontend on port 8481
- [ ] Configured firewall rules (8480, 8481)
- [ ] Tested backend: http://SERVER_IP:8480/api
- [ ] Tested frontend: http://SERVER_IP:8481
- [ ] Both services set to auto-start on boot

---

**Access URLs After Deployment:**
- Frontend: `http://YOUR_SERVER_IP:8481`
- Backend API: `http://YOUR_SERVER_IP:8480/api`
