import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// This ensures we only initialize the app once
if (!admin.apps.length) {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (process.env.GOOGLE_PROJECT_ID && privateKey && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.GOOGLE_PROJECT_ID,
                    privateKey: privateKey,
                    clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                }),
                databaseURL: `https://${process.env.GOOGLE_PROJECT_ID}.firebaseio.com`
            });
        } catch (error) {
            console.error('Firebase admin initialization error', error);
        }
    } else {
         console.warn("Firebase Admin SDK environment variables are not fully set. Skipping initialization.");
    }
}


const db = admin.apps.length ? getFirestore() : null;

export { db };
