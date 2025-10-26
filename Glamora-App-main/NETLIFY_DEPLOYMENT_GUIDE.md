# Netlify Deployment Guide for Admin Dashboard

## 🚀 Quick Deploy

### Step 1: Log in to Netlify
1. Go to https://www.netlify.com/
2. Sign in or create an account (free)
3. Click "Add new site" → "Import an existing project"

### Step 2: Connect Your GitHub Repository
1. Click "GitHub"
2. Authorize Netlify to access your repos
3. Select your repository: `Capstone-Glamora`
4. Click "Configure netlify on this repository"

### Step 3: Configure Build Settings
**IMPORTANT:** Set these exact values:

- **Branch to deploy:** `main`
- **Base directory:** `admin-side`
- **Build command:** (leave empty - no build needed for static files)
- **Publish directory:** `admin-side`

### Step 4: Deploy!
1. Click "Deploy site"
2. Wait for deployment to complete (~30 seconds)
3. Your admin dashboard will be live at: `https://your-app-name.netlify.app`

---

## ⚙️ Site Settings (After Initial Deploy)

Once deployed, go to **Site settings** → **Build & deploy**:

1. **Continuous Deployment**
   - ✅ Auto-publish: ON
   - ✅ Deploy every push: ON

2. **Deploy Contexts**
   - Production branch: `main`

3. **Build Settings**
   - Base directory: `admin-side`
   - Build command: (empty)
   - Publish directory: `admin-side`

---

## 🔍 Verify Your Deployment

### Check API Connection
1. Go to https://your-app-name.netlify.app
2. Open Browser Console (F12)
3. Look for: `✅ Admin dashboard connected to real-time server`
4. If you see errors, check:
   - Backend is running on Render
   - API URL is correct in `admin-side/js/common.js`

### Test Login
1. Login page should load
2. Try logging in with:
   - Username: `admin`
   - Password: `admin123`
3. Should redirect to dashboard

---

## 🎯 Testing Checklist

### ✅ Real-Time Metrics
- [ ] Total Users counter updates
- [ ] Reports Today counter updates  
- [ ] Active Listings counter updates

### ✅ User Management
- [ ] View users from backend
- [ ] User profile pictures load
- [ ] Deactivate/activate works
- [ ] Real-time updates on new user

### ✅ Content Moderation
- [ ] Reports section loads
- [ ] New reports appear instantly
- [ ] Pending items section loads
- [ ] Approve/reject works

### ✅ Analytics
- [ ] Chart displays correctly
- [ ] Data loads from backend
- [ ] Real-time updates work

---

## 📊 Monitoring

### Check Deployment Logs
1. Go to Netlify Dashboard
2. Click on your site
3. Click "Deploys" tab
4. Click on latest deploy
5. View "Deploy log"

### Check Real-Time Updates
1. Open dashboard on Netlify
2. Open mobile app
3. Create a test user
4. Watch dashboard update automatically (no refresh needed!)

---

## 🐛 Troubleshooting

### Problem: "Failed to connect to backend"
**Solution:**
- Check Render backend is running: https://glamora-g5my.onrender.com/health
- Verify API URL in `admin-side/js/common.js`
- Check CORS settings on Render

### Problem: "Socket.IO connection error"
**Solution:**
- Backend needs WebSocket support
- Check Render logs for errors
- Verify Socket.IO is initialized in `GlamoraApp/backend/server.js`

### Problem: "Cannot find module"
**Solution:**
- Ensure Base directory is set to `admin-side`
- Verify all files are in `admin-side/` folder
- Check `package.json` exists in `admin-side/`

---

## 🔐 Security Notes

### Admin Credentials
- Default login: `admin / admin123`
- **Change this in production!**
- Set up proper authentication
- Use environment variables for secrets

### API Security
- All API calls require JWT token
- Socket.IO requires authentication
- CORS configured on Render
- HTTPS enabled by default on Netlify

---

## 🚀 Production Deployment to Hostinger

### When Ready for Production:

1. **Buy Domain** (Hostinger or other)
   - Example: `glamora-admin.com`

2. **Set Custom Domain**
   - Netlify Dashboard → Site settings → Domain management
   - Add custom domain
   - Update DNS records
   - SSL auto-provisioned by Netlify

3. **Update API URL** (if needed)
   - In `admin-side/js/common.js`
   - Currently points to Render
   - Update if domain changes

4. **Configure Environment Variables** (if needed)
   - Netlify Dashboard → Site settings → Environment variables
   - Add any new variables

---

## ✅ Checklist for Go-Live

- [ ] Domain registered
- [ ] DNS configured
- [ ] SSL certificate active
- [ ] Backend running on Render
- [ ] API URL correct
- [ ] All features tested
- [ ] Real-time updates working
- [ ] Mobile app connected
- [ ] Analytics tracking
- [ ] Security configured

---

## 📞 Support

**Netlify Support:**
- Docs: https://docs.netlify.com
- Community: https://answers.netlify.com

**Your Project:**
- Check `ADMIN_DASHBOARD_INTEGRATION.md` for implementation details
- Check Render logs if backend issues occur
- Check Netlify logs if frontend issues occur

---

## 🎉 Success!

Your admin dashboard is now live on Netlify! 🚀

Next steps:
1. Test all features thoroughly
2. Share the URL with team members
3. Monitor analytics
4. When ready, add custom domain

Good luck! 🎊

