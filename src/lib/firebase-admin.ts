import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// This ensures we only initialize the app once
if (!admin.apps.length) {
    // Make sure to replace newline characters in the private key
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!process.env.FIREBASE_ADMIN_PROJECT_ID || !privateKey || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
        console.error("Firebase Admin SDK environment variables are not set.");
    }

    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
                privateKey: privateKey,
                clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            }),
            databaseURL: `https://${process.env.FIREBASE_ADMIN_PROJECT_ID}.firebaseio.com`
        });
    } catch (error) {
        console.error('Firebase admin initialization error', error);
    }
}


const db = getFirestore();

export { db };
