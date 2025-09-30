# 🚀 Deploy Backend to Railway

## Step 1: Prepare Backend for Deployment

1. **Install backend dependencies:**
   ```bash
   cd GlamoraApp/backend
   npm install
   ```

2. **Test backend locally:**
   ```bash
   npm start
   ```
   Should show: `🚀 Server running on http://localhost:3000`

## Step 2: Deploy to Railway

1. **Create Railway account** at [railway.app](https://railway.app)

2. **Connect your GitHub repository:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure deployment:**
   - Set **Root Directory** to: `GlamoraApp/backend`
   - Railway will auto-detect Node.js

4. **Add environment variables:**
   - Go to your project → Variables
   - Add: `PORT=3000`
   - Add: `HOST=0.0.0.0`

5. **Deploy:**
   - Railway will automatically deploy
   - Wait for build to complete

## Step 3: Get Your Production URL

1. **Copy the Railway URL** (e.g., `https://glamora-backend.railway.app`)

2. **Update your config.ts:**
   ```typescript
   // In app/config.ts, replace:
   return 'https://glamora-backend.railway.app'; // Your actual Railway URL
   ```

## Step 4: Test the Deployment

1. **Test the health endpoint:**
   ```
   https://your-railway-url.railway.app/health
   ```
   Should return: `{"status":"ok","message":"Backend is running."}`

2. **Test login endpoint:**
   ```
   POST https://your-railway-url.railway.app/api/auth/login
   ```

## Step 5: Build Your APK

1. **Update EAS configuration:**
   ```bash
   cd GlamoraApp
   eas build --platform android --profile production
   ```

2. **Your APK will now work with the cloud backend!**

## ✅ Benefits:
- ✅ **No more IP management**
- ✅ **Works with APK builds**
- ✅ **Works with web browsers**
- ✅ **Always accessible**
- ✅ **Automatic HTTPS**
- ✅ **Free hosting**

## 🔧 Troubleshooting:

**If deployment fails:**
1. Check Railway logs for errors
2. Ensure all dependencies are in package.json
3. Verify MongoDB connection string is correct

**If API calls fail:**
1. Check Railway URL is correct in config.ts
2. Verify CORS is enabled
3. Test endpoints with Postman/curl

## 📱 Next Steps:
1. Deploy backend to Railway
2. Update config.ts with Railway URL
3. Build APK with `eas build`
4. Test on device - should work perfectly! 🎉 