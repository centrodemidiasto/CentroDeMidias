
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { ServiceAccount } from 'firebase-admin';

let adminApp: App;
let adminDb: Firestore;

const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n'),
};

if (!getApps().length) {
    try {
        adminApp = initializeApp({
            credential: cert(serviceAccount)
        });
    } catch (e: any) {
        console.error("Firebase Admin SDK initialization failed:", e);
    }
} else {
    adminApp = getApps()[0];
}

adminDb = getFirestore(adminApp!);

export { adminDb };
