# 📋 Step-by-Step Guide: Adding Environment Variables in Render Dashboard

## Prerequisites
- You have a Render account
- Your backend service is deployed on Render (or ready to deploy)
- You have your Brevo API key ready

---

## Step 1: Log in to Render Dashboard

1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Sign in with your Render account credentials

---

## Step 2: Navigate to Your Backend Service

1. Once logged in, you'll see your **Dashboard** with a list of services
2. Find your **backend service** (usually named `glamora-backend` or similar)
3. **Click on the service name** to open its details page

---

## Step 3: Open Environment Variables Section

1. In your service's detail page, look at the left sidebar menu
2. Scroll down and **click on "Environment"** (or "Environment Variables")
   - Alternatively, you might see a tab called **"Env"** or **"Environment"** at the top
   - You may also see an **"Environment"** section in the main content area

---

## Step 4: Add BREVO_API_KEY

1. In the Environment Variables section, you'll see a form with:
   - **Key** field (on the left)
   - **Value** field (on the right)
   - An **"Add"** or **"Save"** button

2. **First Variable - BREVO_API_KEY:**
   - In the **Key** field, type: `BREVO_API_KEY`
   - In the **Value** field, paste your Brevo API key
     - To get your Brevo API key:
       - Go to [https://app.brevo.com](https://app.brevo.com)
       - Log in to your Brevo account
       - Navigate to **Settings** → **SMTP & API** → **API Keys**
       - Click **"Generate a new API key"** (or copy an existing one)
       - Copy the API key (it looks like: `xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
   - Click **"Add"** or **"Save"** button

---

## Step 5: Add BREVO_SENDER_EMAIL

1. **Second Variable - BREVO_SENDER_EMAIL:**
   - Click **"Add Environment Variable"** or use the next row
   - In the **Key** field, type: `BREVO_SENDER_EMAIL`
   - In the **Value** field, enter your sender email address:
     - Example: `noreply@glamora.com`
     - Example: `support@yourdomain.com`
     - **Important:** This email must be verified in your Brevo account
   - Click **"Add"** or **"Save"** button

---

## Step 6: Add BREVO_SENDER_NAME

1. **Third Variable - BREVO_SENDER_NAME:**
   - Click **"Add Environment Variable"** or use the next row
   - In the **Key** field, type: `BREVO_SENDER_NAME`
   - In the **Value** field, enter the display name:
     - Example: `Glamora Security`
     - Example: `Glamora App`
     - This is the name that will appear in email recipients' inboxes
   - Click **"Add"** or **"Save"** button

---

## Step 7: Add BASE_URL

1. **Fourth Variable - BASE_URL:**
   - Click **"Add Environment Variable"** or use the next row
   - In the **Key** field, type: `BASE_URL`
   - In the **Value** field, enter your Render backend URL:
     - Find your backend URL at the top of the service page (usually shown as the service URL)
     - Example: `https://glamora-g5my.onrender.com`
     - **Make sure to include `https://` but NO trailing slash**
   - Click **"Add"** or **"Save"** button

---

## Step 8: Verify All Variables Are Added

Your Environment Variables section should now show all four variables:

```
BREVO_API_KEY          xkeysib-xxxxxxxxxxxxxxxxxxxxx
BREVO_SENDER_EMAIL     noreply@glamora.com
BREVO_SENDER_NAME      Glamora Security
BASE_URL               https://glamora-g5my.onrender.com
```

---

## Step 9: Save and Redeploy

1. **After adding all variables:**
   - Some Render dashboards auto-save, others require clicking **"Save Changes"**
   - Look for a **"Save"** or **"Apply"** button at the bottom

2. **Trigger a redeploy:**
   - Render might automatically redeploy when environment variables change
   - If not, go to the **"Manual Deploy"** section
   - Click **"Deploy latest commit"** or **"Clear build cache & deploy"**

---

## Step 10: Verify the Deployment

1. **Check deployment logs:**
   - Go to the **"Logs"** tab in your Render service
   - Look for any errors related to environment variables
   - The server should start successfully

2. **Test the endpoints:**
   - Once deployed, test the email change endpoint
   - If emails aren't sending, check the logs for Brevo-related errors

---

## 🔒 Security Notes

- **Never share your API keys publicly**
- **Never commit API keys to GitHub**
- Environment variables in Render are encrypted at rest
- Only people with access to your Render account can see these variables

---

## ❓ Troubleshooting

### If you can't find "Environment" section:
- Look for **"Env Vars"** or **"Environment Variables"** in the sidebar
- Some Render UIs have it under **"Settings"** → **"Environment"**

### If the values aren't being read:
- Make sure there are no spaces before/after the values
- Ensure variable names match exactly (case-sensitive): `BREVO_API_KEY` not `brevo_api_key`
- Redeploy the service after adding variables

### If emails aren't sending:
- Verify your Brevo API key is correct and active
- Check that the sender email is verified in Brevo
- Check Render logs for error messages

---

## 📝 Quick Reference

Here's a quick checklist of what you need:

- ✅ BREVO_API_KEY - From Brevo dashboard → Settings → SMTP & API → API Keys
- ✅ BREVO_SENDER_EMAIL - A verified email in your Brevo account
- ✅ BREVO_SENDER_NAME - Display name for emails (e.g., "Glamora Security")
- ✅ BASE_URL - Your Render backend URL (e.g., https://glamora-g5my.onrender.com)

---

**Need help?** Check Render's documentation: [https://render.com/docs/environment-variables](https://render.com/docs/environment-variables)

