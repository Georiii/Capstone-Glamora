# API Configuration System

This configuration system automatically handles different environments and makes it easy to deploy your app without changing IP addresses manually.

## 🚀 How It Works

The system automatically detects whether you're in development or production mode and uses the appropriate server URL.

### Development Mode
- Automatically uses your local network IP (`http://192.168.1.6:3000`)
- No manual configuration needed

### Production Mode
- Automatically uses your production server URL (`https://your-domain.com`)
- Set when you build for production

## 📁 Files

- **`api.ts`** - Main configuration file with all API endpoints
- **`README.md`** - This documentation file

## 🔧 Configuration

### Current Settings
```typescript
const SERVER_CONFIG = {
  development: {
    local: 'http://192.168.1.6:3000',  // Your current development IP
    production: 'https://your-domain.com' // Your future production domain
  },
  production: {
    local: 'http://192.168.1.6:3000',  // Fallback local IP
    production: 'https://your-domain.com' // Your production domain
  }
};
```

### How to Change Server URLs

#### 1. Change Development IP
If your local network IP changes (e.g., from `192.168.1.6` to `192.168.0.1`):

```typescript
// In config/api.ts, change this line:
local: 'http://192.168.0.1:3000',  // New IP
```

#### 2. Change Production Domain
When you deploy to production:

```typescript
// In config/api.ts, change this line:
production: 'https://your-actual-domain.com' // Your real domain
```

## 📱 Usage in Your Code

### Before (Hardcoded - Don't do this anymore)
```typescript
const response = await fetch('http://192.168.1.6:3000/api/wardrobe/', {
```

### After (Using Configuration - This is the new way)
```typescript
import { API_ENDPOINTS } from '../config/api';

const response = await fetch(API_ENDPOINTS.wardrobe, {
```

## 🌍 Environment Detection

The system automatically detects your environment:

- **`__DEV__`** - Development mode (uses local IP)
- **Production build** - Production mode (uses production domain)

## 📋 Available Endpoints

All your API endpoints are now centralized:

```typescript
// Authentication
API_ENDPOINTS.login
API_ENDPOINTS.register
API_ENDPOINTS.getUser(email)

// Wardrobe
API_ENDPOINTS.wardrobe
API_ENDPOINTS.addWardrobeItem
API_ENDPOINTS.deleteWardrobeItem(id)

// Marketplace
API_ENDPOINTS.marketplace
API_ENDPOINTS.marketplaceSearch(query)

// Chat
API_ENDPOINTS.chatConversations
API_ENDPOINTS.chatMessages(userId)
API_ENDPOINTS.chatSend
API_ENDPOINTS.chatMarkRead(userId)

// Reports
API_ENDPOINTS.report
```

## 🚀 Deployment Benefits

### Before (Old Way)
1. Deploy to production
2. **Manually change IP in 11+ files** ❌
3. Test each file individually
4. Hope you didn't miss any
5. If network changes, repeat entire process

### After (New Way)
1. Deploy to production
2. **Change one line in config file** ✅
3. All files automatically use new URL
4. Test once, works everywhere

## 🔍 Debugging

You can check your current configuration:

```typescript
import { ENV_INFO } from '../config/api';

console.log('Current API URL:', ENV_INFO.currentApiUrl);
console.log('Is Development:', ENV_INFO.isDevelopment);
console.log('Is Production:', ENV_INFO.isProduction);
```

## 📝 Migration Checklist

- ✅ All hardcoded IP addresses removed
- ✅ All files use `API_ENDPOINTS` configuration
- ✅ Environment detection working
- ✅ No linting errors
- ✅ Ready for production deployment

## 🆘 Troubleshooting

### If something breaks:
1. Check the config file for correct URLs
2. Verify your server is running on the specified IP/domain
3. Check console logs for the current API URL being used
4. Ensure all imports are correct: `import { API_ENDPOINTS } from '../config/api';`

### Rollback if needed:
```typescript
// Temporarily go back to hardcoded (not recommended)
export const API_BASE_URL = 'http://192.168.1.6:3000';
```

## 🎯 Next Steps

1. **Test your app** - Make sure all API calls work
2. **Deploy to production** - Change the production URL in config
3. **Enjoy the benefits** - No more manual IP changes!

---

**Congratulations! 🎉** Your app is now much more maintainable and deployment-friendly! 