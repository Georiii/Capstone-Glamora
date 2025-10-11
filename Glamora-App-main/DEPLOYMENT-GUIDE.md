# 🚀 Glamora App Deployment Guide

This guide will help you deploy your entire Glamora project to Render safely.

## 📋 Pre-Deployment Checklist

### 1. Database Setup (Required)
- [ ] Create MongoDB Atlas account
- [ ] Create a new cluster
- [ ] Get connection string
- [ ] Whitelist Render's IP ranges (0.0.0.0/0 for testing)

### 2. Environment Variables (Required)
Set these in Render Dashboard → Environment:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/glamora
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=3000
```

### 3. Optional Services
- [ ] Cloudinary account (for image uploads)
- [ ] Brevo account (for email notifications)

## 🔧 Deployment Steps

### Step 1: Prepare Your Repository
1. **Rename the deployment files:**
   ```bash
   mv package.deploy.json package.json
   mv server.deploy.js server.js
   ```

2. **Commit and push to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

### Step 2: Deploy to Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name:** `glamora-backend`
   - **Root Directory:** Leave empty (uses root)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Node Version:** `18.x`

### Step 3: Set Environment Variables
In Render Dashboard → Environment Variables:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/glamora
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-mobile-app-domain.com
```

### Step 4: Update Mobile App Configuration
After deployment, update `config/api.ts`:
```typescript
const SERVER_CONFIG = {
  development: {
    local: 'http://localhost:3000',
    production: 'https://your-render-url.onrender.com'
  },
  production: {
    local: 'http://localhost:3000',
    production: 'https://your-render-url.onrender.com' // Your actual Render URL
  }
};
```

## 🔍 Testing Your Deployment

### 1. Health Check
Visit: `https://your-render-url.onrender.com/health`
Should return: `{"status":"OK","timestamp":"...","environment":"production"}`

### 2. Admin Dashboard
Visit: `https://your-render-url.onrender.com/admin`
Should show your admin interface

### 3. API Endpoints
Test: `https://your-render-url.onrender.com/api/auth/login`

## 🚨 Troubleshooting

### Common Issues:

1. **"Cannot find module" errors:**
   - Ensure all dependencies are in `package.json`
   - Check that `npm install` runs successfully

2. **Database connection errors:**
   - Verify MongoDB URI is correct
   - Check MongoDB Atlas IP whitelist
   - Ensure database user has proper permissions

3. **CORS errors:**
   - Update `allowedOrigins` in `server.deploy.js`
   - Add your mobile app domain to the list

4. **Environment variables not working:**
   - Check variable names match exactly
   - Ensure no extra spaces in values
   - Redeploy after adding variables

## 🔄 Rollback Plan

If deployment fails:
1. **Immediate rollback:** Use Render's rollback button
2. **Code rollback:** 
   ```bash
   git checkout HEAD~1
   git push origin main
   ```
3. **Restore original files:**
   ```bash
   git checkout HEAD~1 -- package.json server.js
   ```

## 📱 Mobile App Updates

After successful deployment:
1. Update `config/api.ts` with production URL
2. Test mobile app with production API
3. Build new APK with updated configuration
4. Deploy to app stores

## 🔒 Security Considerations

- [ ] Use strong JWT secrets
- [ ] Enable MongoDB Atlas security features
- [ ] Set up proper CORS origins
- [ ] Use HTTPS in production
- [ ] Regular security updates

## 📞 Support

If you encounter issues:
1. Check Render logs
2. Verify environment variables
3. Test API endpoints individually
4. Check MongoDB Atlas connection

---

**Note:** This deployment preserves your original development setup. The deployment files are separate and won't interfere with your local development.
