# 🚀 Activating Real-World Intelligence

To switch BuildCompare SA from "Mock Mode" to "Real AI Mode", follow these simple steps.

## 1. Get a Free Google Gemini API Key
BuildCompare uses **Google Gemini 1.5 Flash** (via the Google AI Studio) to analyze your images. It's currently free for most use cases.

1.  Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Click **"Create API key"**.
3.  Copy the key (it starts with `AIza...`).

## 2. Configure Your App
1.  Create a file named `.env.local` in the root of your project (where `package.json` is).
2.  Add the following line to it:

```env
GEMINI_API_KEY=your_copied_api_key_here
```

3.  Restart your development server:
    - Press `Ctrl + C` in your terminal to stop it.
    - Run `npm run dev` again.

## 3. Test It!
1.  Go to the **"Price Compare"** tab.
2.  Drag and drop a **real photo** of a handwritten list or a stack of bricks.
3.  Watch the "Analyzing..." step. It is now actually sending the image to Google's AI!
4.  The results you see are extracted from *your* image, not simulated data.

---

## 4. (Coming Soon) Real Web Search
Currently, the search functionality uses cached market data. To enable live web scraping, we will connect a SERP API in the next update. for now, the AI "Action Bot" simulates this with high-fidelity market data.
