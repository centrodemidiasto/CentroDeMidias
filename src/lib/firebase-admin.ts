
// src/lib/firebase-admin.ts
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { ServiceAccount } from 'firebase-admin';

// Log das variáveis de ambiente para depuração
console.log("--- Reading Environment Variables for Firebase Admin ---");
console.log("FIREBASE_ADMIN_PROJECT_ID:", process.env.FIREBASE_ADMIN_PROJECT_ID ? 'Loaded' : 'MISSING');
console.log("FIREBASE_ADMIN_CLIENT_EMAIL:", process.env.FIREBASE_ADMIN_CLIENT_EMAIL ? 'Loaded' : 'MISSING');
console.log("FIREBASE_ADMIN_PRIVATE_KEY:", process.env.FIREBASE_ADMIN_PRIVATE_KEY ? 'Loaded' : 'MISSING');
console.log("--- End of Environment Variables ---");


const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

if (!privateKey) {
  console.error("CRITICAL: FIREBASE_ADMIN_PRIVATE_KEY is missing. Cannot initialize Firebase Admin SDK.");
}

const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: privateKey ? privateKey.replace(/\\n/g, '\n') : '',
};

let adminApp: App;
if (!getApps().length) {
    try {
        adminApp = initializeApp({
            credential: cert(serviceAccount)
        });
        console.log("Firebase Admin SDK initialized successfully.");
    } catch(e: any) {
        console.error("CRITICAL: Failed to initialize Firebase Admin SDK.", e.message);
        // Lançar um erro aqui pode impedir que o servidor inicie, o que é bom para depuração
        // throw new Error("Could not initialize Firebase Admin SDK. Check server logs.");
    }
} else {
  adminApp = getApps()[0];
}

const adminDb: Firestore = getFirestore(adminApp!);

export { adminDb };
