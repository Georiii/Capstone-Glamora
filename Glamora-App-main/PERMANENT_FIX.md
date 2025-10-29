# Permanent Fix for Marketplace HTTP/HTTPS Issue

## Problem
Your browser is forcing `localhost` to use HTTPS, but your backend runs on HTTP. This prevents the marketplace from loading.

## Permanent Solution (Choose One)

### Option 1: Clear Chrome HSTS (Recommended)

1. Open Chrome
2. Navigate to: `chrome://net-internals/#hsts`
3. Scroll down to "Delete domain security policies"
4. Enter: `localhost` 
5. Click **Delete**
6. Close and reopen Chrome

**Note:** You may need to repeat this if Chrome auto-upgrades again. To prevent it permanently, see Option 3.

---

### Option 2: Use Incognito Mode

1. Press `Ctrl+Shift+N` (Windows) or `Cmd+Shift+N` (Mac)
2. Open your app in Incognito mode
3. The marketplace will work because Incognito doesn't have stored HSTS policies

**Note:** You'll need to log in again each time.

---

### Option 3: Start Expo with HTTP-Only (Best Permanent Fix)

1. Edit your `package.json` in `GlamoraApp` folder
2. Add this script:

```json
"scripts": {
  "start:http": "expo start --web --http"
}
```

3. Run:
```bash
npm run start:http
```

This forces Expo to use HTTP and prevents HTTPS auto-upgrade.

---

### Option 4: Access via 127.0.0.1 Instead

Instead of `http://localhost:8081`, use:
```
http://127.0.0.1:8081
```

**Note:** This might not work if browsers also upgrade this IP.

---

## Recommended Setup

For daily development, use **Option 3** (start with `--http` flag). This is the cleanest solution.

Add this to your `package.json`:

```json
"scripts": {
  "start": "expo start",
  "start:http": "expo start --web --http",
  "start:web": "expo start --web --http"
}
```

Then always run:
```bash
npm run start:http
```

## Verification

After applying any fix:
1. Open marketplace page
2. Check browser console - it should show: `🌐 Web environment detected - using http://localhost:5000`
3. You should see all 15 marketplace items load

## Troubleshooting

If marketplace still shows empty:
1. Open DevTools (F12)
2. Check Console for errors
3. Check Network tab - all API calls should be to `http://localhost:5000`
4. If you see `https://localhost:5000`, HSTS is still active


