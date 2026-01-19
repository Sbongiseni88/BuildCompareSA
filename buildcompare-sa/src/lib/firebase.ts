import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck } from "firebase/app-check";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase (Singleton pattern)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app);

// Analytics only runs in the browser
const analytics = typeof window !== "undefined" ? isSupported().then((supported) => supported ? getAnalytics(app) : null) : null;

// App Check - only runs in the browser environment
let appCheck: AppCheck | null = null;

if (typeof window !== "undefined" && process.env.NODE_ENV === 'production') {
    const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    if (recaptchaSiteKey) {
        try {
            appCheck = initializeAppCheck(app, {
                provider: new ReCaptchaV3Provider(recaptchaSiteKey),
                isTokenAutoRefreshEnabled: true,
            });
            console.log("✅ Firebase App Check initialized");
        } catch (error) {
            console.error("❌ Firebase App Check initialization failed:", error);
        }
    } else {
        console.warn("⚠️ NEXT_PUBLIC_RECAPTCHA_SITE_KEY not set. App Check disabled.");
    }
} else if (typeof window !== "undefined") {
    console.log("ℹ️ App Check disabled in development");
}

export { app, auth, db, analytics, appCheck };
