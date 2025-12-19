# 🚀 Deployment Guide: From Localhost to Investor-Ready URL

To share **BuildCompare SA** with investors, you need to deploy it to the cloud. We recommend **Vercel** as it is the creators of Next.js and offers the best performance and free tier.

## 🔴 CRITICAL: Directory Layout & 404 Fix
**If you see a 404 Error after deploying:**
This happens because your code is inside a subfolder (`buildcompare-sa`) inside your repository.

**How to Fix:**
1.  Go to your Vercel Project **Settings**.
2.  Under **General**, find **Root Directory**.
3.  Click **Edit** and select `buildcompare-sa` folder.
4.  Click **Save**.
5.  Go to **Deployments** and **Redeploy**.

---

## Option 1: The "Pro" Way (via GitHub + Vercel)
*Best for long-term projects. Updates automatically when you save code.*

1.  **Push to GitHub**
    *   Initialize git if you haven't: `git init` (in the root folder)
    *   Add files: `git add .`
    *   Commit: `git commit -m "Investor Demo Ready"`
    *   Create a new repository on GitHub.com and follow the instructions to push.

2.  **Connect to Vercel**
    *   Go to [vercel.com](https://vercel.com) and Sign Up.
    *   Click **"Add New..."** -> **"Project"**.
    *   Select your repository.
    *   **Check "Root Directory"**: If it asks, ensure you select `buildcompare-sa`.
    *   **Environment Variables**:
        *   Add `GEMINI_API_KEY` and paste your Google Gemini key.
    *   Click **Deploy**.

## Option 2: The "Fast" Way (Vercel CLI)
1.  **Install Vercel CLI**: `npm i -g vercel`
2.  **Deploy**:
    *   Run: `vercel` inside the `buildcompare-sa` folder!
    *   Follow prompts.

---

## 🔄 How to Update Your Live Site automatically
**Question**: *If I make changes to the code, will the link update?*

### If you connected via GitHub (Recommended):
**YES, Automatically!** 
Every time you run these commands in your terminal, Vercel will detect the changes and update your website within minutes:
```bash
git add .
git commit -m "Added bold new features"
git push
```
*You don't need to do anything on Vercel.com except wait for the "Ready" email.*

### If you used Vercel CLI:
**No, you must manually update.**
You have to run this command every time you want to update the live link:
```bash
vercel --prod
```

---

## ⚠️ Pre-Deployment Checklist
- [x] **Theme**: Dark Mode is set to 'Slate 950' (Premium Look).
- [x] **Features**: Smart Estimator, Price Search, and Dashboard are active.
- [ ] **API Keys**: Ensure `GEMINI_API_KEY` is added to the deployment settings.

**Note for Investor Demo:**
The "Upload/Scan" feature uses the Google Gemini API. If the API key is not set in Vercel, the app will use the "Mock Fallback" mode, which is still perfectly fine for a demo!
