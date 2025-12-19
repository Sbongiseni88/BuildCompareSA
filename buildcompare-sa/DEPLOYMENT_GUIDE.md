# 🚀 Deployment Guide: From Localhost to Investor-Ready URL

To share **BuildCompare SA** with investors, you need to deploy it to the cloud. We recommend **Vercel** as it is the creators of Next.js and offers the best performance and free tier.

## Option 1: The "Pro" Way (via GitHub + Vercel)
*Best for long-term projects. Updates automatically when you save code.*

1.  **Push to GitHub**
    *   Initialize git if you haven't: `git init`
    *   Add files: `git add .`
    *   Commit: `git commit -m "Investor Demo Ready"`
    *   Create a new repository on GitHub.com and follow the instructions to push.

2.  **Connect to Vercel**
    *   Go to [vercel.com](https://vercel.com) and Sign Up (you can use your GitHub account).
    *   Click **"Add New..."** -> **"Project"**.
    *   Select your `buildcompare-sa` repository from the list.
    *   **Environment Variables**:
        *   Add `GEMINI_API_KEY` and paste your Google Gemini key.
    *   Click **Deploy**.

3.  **Result**: You will get a link like `buildcompare-sa.vercel.app`. Send this to your investor.

---

## Option 2: The "Fast" Way (Vercel CLI)
*Best if you don't want to use GitHub right now.*

1.  **Install Vercel CLI**
    *   Open your terminal and run: `npm i -g vercel`

2.  **Deploy**
    *   Run: `vercel`
    *   Follow the prompts:
        *   Set up and deploy? **Y**
        *   Which scope? (Select your account)
        *   Link to existing project? **N**
        *   Project name? **buildcompare-sa**
        *   Directory? **./** (Just press Enter)
    *   Wait for upload.

3.  **Production Push**
    *   Run: `vercel --prod`
    *   This gives you the final, live URL.

---

## ⚠️ Pre-Deployment Checklist
- [x] **Theme**: Dark Mode is set to 'Slate 950' (Premium Look).
- [x] **Features**: Smart Estimator, Price Search, and Dashboard are active.
- [ ] **API Keys**: Ensure `GEMINI_API_KEY` is added to the deployment settings.

**Note for Investor Demo:**
The "Upload/Scan" feature uses the Google Gemini API. If the API key is not set in Vercel, the app will use the "Mock Fallback" mode, which is still perfectly fine for a demo!
