
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { ServiceAccount } from 'firebase-admin';

const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

let adminApp: App;
if (!getApps().length) {
    try {
        adminApp = initializeApp({
            credential: cert(serviceAccount)
        });
    } catch(e: any) {
        console.error("Failed to initialize Firebase Admin SDK.", e.message);
    }
} else {
  adminApp = getApps()[0];
}

const adminDb: Firestore = getFirestore(adminApp!);

export { adminDb };
