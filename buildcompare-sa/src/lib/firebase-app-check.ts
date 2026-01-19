/**
 * Firebase App Check Configuration
 * 
 * This module initializes Firebase App Check to protect backend resources
 * from unauthorized access and abuse.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/**
 * Initialize Firebase App Check
 * 
 * IMPORTANT: To complete setup, you must:
 * 1. Go to Firebase Console > App Check
 * 2. Register your app with reCAPTCHA v3 provider
 * 3. Add your domain to the authorized domains list
 * 4. Set the NEXT_PUBLIC_RECAPTCHA_SITE_KEY environment variable
 * 
 * For development, you can enable debug mode:
 * - Set self.FIREBASE_APPCHECK_DEBUG_TOKEN = true in browser console
 */
export function initializeFirebaseAppCheck() {
    if (typeof window === 'undefined') {
        // App Check is client-side only
        return null;
    }

    const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    if (!recaptchaSiteKey) {
        console.warn(
            '⚠️ Firebase App Check: NEXT_PUBLIC_RECAPTCHA_SITE_KEY not set. ' +
            'App Check will not be enabled.'
        );
        return null;
    }

    try {
        const appCheck = initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(recaptchaSiteKey),
            isTokenAutoRefreshEnabled: true,
        });

        console.log('✅ Firebase App Check initialized');
        return appCheck;
    } catch (error) {
        console.error('❌ Firebase App Check initialization failed:', error);
        return null;
    }
}

export { app };
