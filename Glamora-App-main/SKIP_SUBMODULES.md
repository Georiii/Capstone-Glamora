# Skip Submodules in Netlify

## The Problem
Netlify is trying to checkout a Git submodule `Glamora-App-main/Glamora-App-main` which doesn't exist, causing all builds to fail.

## The Solution
Add this environment variable in Netlify:

**Variable Name:** `NETLIFY_SUBMODULES_FETCH`
**Value:** `0`

This tells Netlify to skip all submodule checkout operations.

## How to Add:

1. Go to: https://app.netlify.com/sites/glamoraapp/configuration/env
2. Click "Add environment variable"
3. Enter:
   - Key: `NETLIFY_SUBMODULES_FETCH`
   - Value: `0`
4. Click "Save"
5. This will trigger a new deploy

## Alternative: Check settings

Go to: https://app.netlify.com/sites/glamoraapp/configuration/deploys

Look for a checkbox: "Skip submodules" or "Don't checkout submodules"

If you see it, check it!

