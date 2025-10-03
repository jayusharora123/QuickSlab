# PSA API Proxy Backend

A secure Node.js backend to proxy requests to the PSA API without exposing your API key in frontend code.

## 🚀 Super Simple Setup (One-Time Only)

**Just double-click `setup.bat` and you're done!**

Or if you prefer command line:
```bash
# Run setup once
.\setup.bat
```

## 🎯 Server Management (Easy!)

### Start Server
**Double-click `start-server.bat`** - Opens in its own window

### Restart Server  
**Double-click `restart-server.bat`** - Kills old server and starts fresh

### Stop Server
**Double-click `stop-server.bat`** - Cleanly stops the server

### Terminal-Friendly Workflow
```bash
# Start (keeps same terminal window)
.\start-server.bat

# Restart (in another terminal if needed)
.\restart-server.bat

# Stop
.\stop-server.bat
```

## 📁 What You Get

- ✅ Automatic Node.js detection
- ✅ Automatic dependency installation  
- ✅ API key stored securely in `.env` file
- ✅ No manual PATH configuration needed
- ✅ No manual environment variables
- ✅ One-click startup/restart/stop
- ✅ Same terminal window reuse
- ✅ Clean server management

## 🔧 Manual Setup (If Needed)

<details>
<summary>Click to expand manual instructions</summary>

1. Install dependencies:
```bash
npm install
```

2. Your API key is already configured in `.env` file. To change it:
```bash
# Edit .env file and update:
PSA_API_KEY=your-new-api-key-here
```

3. Start the server:
```bash
npm start
```
</details>

## Usage

The server will run on `http://localhost:3000`

### Endpoints

- `GET /api/cert/:certNumber` - Get PSA certificate data
- `GET /health` - Health check

### Example Frontend Code

Update your HTML to use the backend proxy instead of calling PSA API directly:

```javascript
// Replace the PSA API URL with your backend
const response = await fetch(`http://localhost:3000/api/cert/${cert}`);
```

## Security Benefits

- ✅ API key is stored securely on the server
- ✅ API key is never exposed to client-side code
- ✅ Backend can implement additional security measures
- ✅ Rate limiting can be implemented server-side
- ✅ Request validation and sanitization

## Production Deployment

1. Use environment variables for API keys
2. Enable HTTPS
3. Implement proper authentication
4. Add rate limiting
5. Use a process manager like PM2