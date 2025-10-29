# 🚀 Deployment Steps for Render

## ✅ Step 1: Code Committed & Pushed
- Changes have been committed and pushed to GitHub
- Branch: `fix-version-from-86624e7` → merged to `main`

## 🔍 Step 2: Check Render Dashboard

1. **Go to Render Dashboard:**
   - Visit: https://dashboard.render.com
   - Sign in to your account

2. **Find Your Backend Service:**
   - Look for service named `glamora-backend`
   - Click on it to open

3. **Check Current Branch:**
   - Go to **Settings** → **Build & Deploy**
   - Verify **Branch** is set to `main`
   - If not, change it to `main` and save

## 🔄 Step 3: Trigger Deployment

Render should automatically detect the new commit on `main` branch. If it doesn't:

1. Go to **Manual Deploy** section
2. Click **"Clear build cache & deploy"** or **"Deploy latest commit"**
3. Wait for deployment (usually 2-5 minutes)

## 📊 Step 4: Monitor Deployment

1. **Watch the Logs:**
   - Go to **Logs** tab
   - You should see:
     ```
     ✅ MongoDB Atlas connected!
     🚀 Server running on http://0.0.0.0:5000
     ```
   - Look for any error messages

2. **Check Build Status:**
   - Status should change from "Building" → "Deploying" → "Live"

## ✅ Step 5: Verify Deployment

Once deployment is "Live", test the endpoints:

### Test Health Endpoint:
```bash
# In browser or curl:
https://glamora-g5my.onrender.com/health
```
Should return: `{"status":"ok","message":"Backend is running.",...}`

### Test New Endpoints:
- Email Change: `POST /api/auth/request-email-change`
- Password Change: `PUT /api/auth/change-password`

Both should return proper responses (no 404 errors).

## 🛠️ Step 6: Add Environment Variables (If Not Done)

If you haven't added Brevo environment variables yet:

1. Go to **Environment** section in Render Dashboard
2. Add these variables:
   - `BREVO_API_KEY` = [Your Brevo API key]
   - `BREVO_SENDER_EMAIL` = noreply@glamora.com
   - `BREVO_SENDER_NAME` = Glamora Security
   - `BASE_URL` = https://glamora-g5my.onrender.com

3. **Save** - Render will auto-redeploy

## 🎯 Step 7: Test in Your App

1. **Clear browser cache** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Go to Security page** in your app
3. **Try changing email** - should work now!
4. **Try changing password** - should work now!

## ❌ Troubleshooting

### If deployment fails:

**Check Logs for Errors:**
- Look for red error messages
- Common issues:
  - `Cannot find module 'sib-api-v3-sdk'` → Check `backend/package.json`
  - `Cannot find module './services/emailService'` → File should exist
  - `PORT already in use` → Usually resolves on retry

**Verify Files Are Deployed:**
- Check that `backend/routes/auth.js` exists
- Check that `backend/services/emailService.js` exists

### If endpoints still return 404:

1. **Verify rootDir in render.yaml:**
   - Should be: `rootDir: backend`

2. **Check Render service settings:**
   - Settings → Root Directory should be: `backend`
   - If incorrect, update and redeploy

3. **Check branch:**
   - Ensure Render is watching `main` branch
   - Verify latest commit is on main

### If emails aren't sending:

1. **Verify environment variables** are set in Render
2. **Check Brevo API key** is valid and active
3. **Check Render logs** for Brevo API errors
4. **Verify sender email** is verified in Brevo account

## 📝 Quick Reference

**Current Status:**
- ✅ Code committed: `470cfb5`
- ✅ Pushed to: `origin/main`
- ⏳ Waiting for: Render auto-deployment

**Next Actions:**
1. Check Render Dashboard for deployment
2. Monitor deployment logs
3. Test endpoints once "Live"
4. Add environment variables if needed
5. Test in app

---

**Deployment URL:** https://glamora-g5my.onrender.com
**Monitor Dashboard:** https://dashboard.render.com

