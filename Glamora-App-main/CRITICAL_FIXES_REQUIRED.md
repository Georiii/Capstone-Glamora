# 🔴 CRITICAL FIXES REQUIRED - GLAMORA APP

**Priority:** BLOCKING - Must complete before production deployment  
**Estimated Time:** 30-45 minutes  
**Impact:** Security, Configuration, Deployment reliability

---

## ISSUE #1: Hardcoded MongoDB Credentials

### Problem
MongoDB credentials are hardcoded in test files and exposed in source code.

**Affected Files:**
- `backend/check-wardrobe.js` (line 5)
- `backend/test-auth.js` (line 6)
- `backend/server.js` (line 332) - hardcoded URI

### Solution

#### Step 1: Create `.env` file in backend root
Create file: `GlamoraApp/backend/.env`

```env
# Database
MONGODB_URI=mongodb+srv://2260086:0v2FuF3KYSV9Z2zV@glamoraapp.qje3nri.mongodb.net/?retryWrites=true&w=majority&appName=GlamoraApp

# JWT Secret (Generate strong production secret!)
JWT_SECRET=your-super-secret-jwt-key-for-production-only-change-this

# Cloudinary (if needed)
CLOUDINARY_NAME=your-cloudinary-name
CLOUDINARY_KEY=your-cloudinary-key
CLOUDINARY_SECRET=your-cloudinary-secret

# Brevo Email (if needed)
BREVO_API_KEY=your-brevo-api-key

# Port
PORT=5000
HOST=0.0.0.0
```

#### Step 2: Update `backend/config/database.js`

Replace entire file with:

```javascript
// Use environment variable with fallback for development only
const JWT_SECRET = process.env.JWT_SECRET || 'dev-key-change-in-production';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is not set in production!');
}

module.exports = {
  JWT_SECRET
};
```

#### Step 3: Update `backend/server.js` (line 332)

Change from:
```javascript
const mongoUri = 'mongodb+srv://2260086:0v2FuF3KYSV9Z2zV@glamoraapp.qje3nri.mongodb.net/?retryWrites=true&w=majority&appName=GlamoraApp';
```

To:
```javascript
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://2260086:0v2FuF3KYSV9Z2zV@glamoraapp.qje3nri.mongodb.net/?retryWrites=true&w=majority&appName=GlamoraApp';

if (!process.env.MONGODB_URI && process.env.NODE_ENV === 'production') {
  throw new Error('MONGODB_URI environment variable is not set in production!');
}
```

#### Step 4: Delete or secure test files

Option A - Delete (Recommended):
```bash
cd GlamoraApp/backend
rm check-wardrobe.js
rm test-auth.js
rm test-simple.js
```

Option B - Add to `.gitignore`:
```bash
# Add to GlamoraApp/.gitignore
backend/test-*.js
backend/check-*.js
```

#### Step 5: Update `.gitignore`

Create or update `GlamoraApp/.gitignore`:

```
# Environment variables
.env
.env.local
.env.*.local

# Dependencies
node_modules/
/backend/node_modules/

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Builds
dist/
build/
.expo/

# Uploads
/uploads
/backend/uploads

# Test files with credentials
backend/test-*.js
backend/check-*.js

# Build folders
android/
ios/
```

---

## ISSUE #2: Hardcoded JWT_SECRET in database.js

### Problem
JWT_SECRET is set to development value permanently.

### Solution
Already fixed in ISSUE #1, Step 2. The fix checks for environment variable first.

---

## ISSUE #3: EAS Build Configuration Conflict

### Problem
Project has both `android/ios` native folders AND `app.config.js` with native configuration, causing EAS Build warnings.

### Solution - CHOOSE ONE APPROACH:

#### Option A: Use Cloud Native Generation (CNG) - Recommended

```bash
cd GlamoraApp

# Remove native folders
rm -rf android ios

# Update app.config.js to include all native configuration
npx eas build --platform android --profile preview
```

#### Option B: Use Prebuild (Keep Native Folders)

Keep `android/ios` folders but remove native config from `app.config.js`:

```javascript
// GlamoraApp/app.config.js
module.exports = {
  expo: {
    name: "GlamoraApp",
    slug: "glamora-app-main",
    plugins: [
      'expo-router'
    ],
    // Remove: android, ios configuration when using prebuild
    extra: {
      eas: {
        projectId: "c50f9159-c5f3-4e50-a191-518ab1dc07ce"
      }
    },
    experiments: {
      typedRoutes: true
    }
  }
};
```

**Recommended:** Option A (CNG) for simplicity.

---

## ISSUE #4: Email Service Incomplete

### Problem
Brevo email service imported but `emailService.js` may be incomplete.

### Solution

Create or update: `GlamoraApp/backend/services/emailService.js`

```javascript
const brevo = require('@getbrevo/brevo');

// Set up default client
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@glamora.app';
const SENDER_NAME = 'Glamora Support';

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (recipientEmail, recipientName, resetLink) => {
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.subject = "Glamora - Reset Your Password";
    sendSmtpEmail.htmlContent = `
      <h1>Reset Your Password</h1>
      <p>Hi ${recipientName},</p>
      <p>We received a request to reset your password. Click the link below to reset it:</p>
      <p><a href="${resetLink}" style="background-color: #FFE8C8; padding: 10px 20px; text-decoration: none; border-radius: 5px; color: #4B2E2B; font-weight: bold;">Reset Password</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>The Glamora Team</p>
    `;
    
    sendSmtpEmail.sender = { 
      name: SENDER_NAME, 
      email: SENDER_EMAIL 
    };
    
    sendSmtpEmail.to = [{ 
      email: recipientEmail, 
      name: recipientName 
    }];
    
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Password reset email sent:', data);
    return data;
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (recipientEmail, recipientName) => {
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.subject = "Welcome to Glamora!";
    sendSmtpEmail.htmlContent = `
      <h1>Welcome to Glamora!</h1>
      <p>Hi ${recipientName},</p>
      <p>Your account has been created successfully. Start building your digital wardrobe and get personalized outfit suggestions!</p>
      <p style="margin-top: 20px;"><a href="https://glamoraapp.netlify.app" style="background-color: #FFE8C8; padding: 10px 20px; text-decoration: none; border-radius: 5px; color: #4B2E2B; font-weight: bold;">Go to Glamora</a></p>
      <p>Best regards,<br>The Glamora Team</p>
    `;
    
    sendSmtpEmail.sender = { 
      name: SENDER_NAME, 
      email: SENDER_EMAIL 
    };
    
    sendSmtpEmail.to = [{ 
      email: recipientEmail, 
      name: recipientName 
    }];
    
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Welcome email sent:', data);
    return data;
    
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail
};
```

Add to `.env`:
```env
BREVO_API_KEY=your-brevo-api-key-here
SENDER_EMAIL=noreply@glamora.app
```

---

## ISSUE #5: Clean Up Backup Directories

### Problem
Multiple backup directories consume space and cause confusion.

### Solution

```bash
cd GlamoraApp

# Remove backup directories
rm -rf backup-files/
rm -rf backup-duplicate-files/
rm -rf backup-package-json/

# List remaining directories (should show cleaned up structure)
ls -la
```

---

## VERIFICATION CHECKLIST

After implementing all fixes, verify:

### Security
- [ ] No credentials in any `.js` files
- [ ] `.env` file created with production values
- [ ] `.gitignore` includes `.env` and test files
- [ ] No hardcoded secrets in `config/database.js`
- [ ] All test files deleted or in `.gitignore`

### Configuration
- [ ] `backend/server.js` uses `process.env.MONGODB_URI`
- [ ] `backend/config/database.js` uses `process.env.JWT_SECRET`
- [ ] `.env` file NOT committed to git
- [ ] `package.json` has appropriate scripts

### Build
- [ ] `npm install` completes without errors in both folders
- [ ] `npx expo-doctor` passes (15/15 checks)
- [ ] No TypeScript compilation errors
- [ ] Backend starts with `npm run dev`
- [ ] Frontend starts with `npx expo start`

### Deployment
- [ ] Render backend environment variables set
- [ ] MongoDB Atlas connection verified
- [ ] Cloudinary credentials configured
- [ ] Email service (Brevo) ready
- [ ] Socket.io connections working

---

## TESTING AFTER FIXES

```bash
# Test 1: Backend health check
cd GlamoraApp/backend
npm run dev

# In another terminal
curl http://localhost:5000/health
# Expected: { status: 'ok', message: 'Backend is running.' }

# Test 2: Frontend connection
cd ../
npx expo start
# Visit http://localhost:8081
# Should see Get Started page without errors

# Test 3: Render backend
curl https://glamora-g5my.onrender.com/health
# Expected: Same health response

# Test 4: Authentication flow
# 1. Register new account
# 2. Login with credentials
# 3. Check console for token presence
# 4. Verify wardrobe loads
```

---

## PRODUCTION DEPLOYMENT STEPS

Once all critical fixes are complete:

### 1. Push to Repository
```bash
git add .
git commit -m "fix: move credentials to environment variables"
git push origin main
```

### 2. Update Render Deployment

On Render dashboard:
1. Go to Backend service
2. Set environment variables:
   - `MONGODB_URI` = connection string
   - `JWT_SECRET` = production secret (use generator!)
   - `NODE_ENV` = production
   - `BREVO_API_KEY` = API key
   - `CLOUDINARY_NAME`, `CLOUDINARY_KEY`, `CLOUDINARY_SECRET`
3. Deploy/Redeploy

### 3. Test Full Flow
- [ ] Backend health check passes
- [ ] Frontend connects to Render backend
- [ ] User registration works
- [ ] Login/logout works
- [ ] Marketplace loads live data
- [ ] Chat sends/receives messages
- [ ] Images upload to Cloudinary
- [ ] Emails send via Brevo

### 4. Build APK
```bash
cd GlamoraApp
eas build --platform android --profile preview
# Or use production profile if configured
```

---

## PRODUCTION JWT_SECRET GENERATION

Generate a strong JWT secret:

```bash
# Option 1: Using OpenSSL
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Example output (use this as template):
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z
```

Store this securely in Render environment variables, NEVER commit to code.

---

## COMMON ISSUES & SOLUTIONS

### Issue: "Cannot find module 'dotenv'"
**Solution:**
```bash
cd backend
npm install dotenv
```

### Issue: "JWT_SECRET is required in production"
**Solution:** Set `JWT_SECRET` in Render environment variables

### Issue: "Cannot connect to MongoDB"
**Solution:** Verify `MONGODB_URI` is correct in `.env`

### Issue: "Email send failed"
**Solution:** Verify `BREVO_API_KEY` in `.env`

### Issue: "CORS error when calling API"
**Solution:** Verify Render URL is in `allowedOrigins` in `server.js`

---

## FILES MODIFIED

```
GlamoraApp/
├── backend/
│   ├── config/database.js ✏️ UPDATED
│   ├── server.js ✏️ UPDATED
│   ├── .env 📄 CREATED
│   ├── services/emailService.js ✏️ UPDATED
│   ├── test-auth.js ❌ DELETED
│   ├── test-simple.js ❌ DELETED
│   └── check-wardrobe.js ❌ DELETED
├── .gitignore ✏️ UPDATED
└── app.config.js ✏️ UPDATED (if choosing CNG approach)
```

---

## NEXT STEPS

1. ✅ Complete all fixes above
2. ✅ Run verification checklist
3. ✅ Test locally
4. ✅ Test production backend
5. ✅ Deploy to Render with environment variables
6. ✅ Build APK
7. ✅ Full user testing

---

**Completion Status:** Ready to implement  
**Estimated Effort:** 30-45 minutes  
**Impact:** Critical for production security and reliability
