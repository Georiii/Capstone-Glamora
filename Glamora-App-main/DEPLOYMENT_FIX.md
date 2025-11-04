# Netlify Deployment Fix - Submodule Issue

## Problem
Netlify deployment fails with:
```
Failed during stage 'preparing repo': Error checking out submodules: 
fatal: No url found for submodule path 'Glamora-App-main/Glamora-App-main' in .gitmodules
```

## Root Cause
The Git repository contains a `.gitmodules` file with an invalid submodule entry for `Glamora-App-main/Glamora-App-main` that has no URL configured.

## Solutions

### Option 1: Remove the Problematic Submodule (Recommended)

Run these Git commands in your repository root:

```bash
# Remove the submodule entry from .gitmodules
git rm --cached Glamora-App-main/Glamora-App-main

# Remove the submodule directory (if it exists)
rm -rf .git/modules/Glamora-App-main/Glamora-App-main

# Remove the submodule entry from .git/config (if present)
git config --remove-section submodule.Glamora-App-main/Glamora-App-main 2>/dev/null || true

# Commit the changes
git add .gitmodules
git commit -m "Remove invalid submodule entry"
git push
```

### Option 2: Fix the Submodule URL

If the submodule is actually needed, edit `.gitmodules` and add a valid URL:

```bash
# Edit .gitmodules and ensure it has a valid URL:
[submodule "Glamora-App-main/Glamora-App-main"]
    path = Glamora-App-main/Glamora-App-main
    url = <valid-git-repository-url>
```

### Option 3: Disable Submodules in Netlify UI

1. Go to Netlify Dashboard → Your Site → Site Settings → Build & Deploy → Environment
2. Add an environment variable: `NETLIFY_SKIP_SUBMODULES=true`
3. Or in Build & Deploy → Continuous Deployment → Deploy Settings, ensure "Submodules" is disabled

## Current Configuration

The `netlify.toml` file is already configured with:
- `[git] submodules = false` - This should disable submodules, but Netlify sometimes still tries to initialize them during repo preparation if `.gitmodules` exists.

## After Fixing

Once the submodule issue is resolved, the deployment should proceed successfully using the configured `netlify.toml` settings.
