import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// This ensures we only initialize the app once
if (!admin.apps.length) {
    const projectId = process.env.GOOGLE_PROJECT_ID;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

    console.log("Firebase Admin SDK - Verificando variáveis de ambiente...");
    console.log("GOOGLE_PROJECT_ID:", projectId ? "Encontrado" : "NÃO ENCONTRADO");
    console.log("GOOGLE_PRIVATE_KEY:", privateKey ? "Encontrado" : "NÃO ENCONTRADO");
    console.log("GOOGLE_SERVICE_ACCOUNT_EMAIL:", clientEmail ? "Encontrado" : "NÃO ENCONTRADO");

    if (projectId && privateKey && clientEmail) {
        try {
            console.log("Inicializando Firebase Admin SDK...");
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: projectId,
                    privateKey: privateKey,
                    clientEmail: clientEmail,
                }),
                databaseURL: `https://${projectId}.firebaseio.com`
            });
            console.log("Firebase Admin SDK inicializado com sucesso.");
        } catch (error) {
            console.error('Firebase admin initialization error', error);
        }
    } else {
         console.warn("Variáveis de ambiente para o Firebase Admin SDK não estão completamente configuradas. Pulando inicialização.");
    }
}


const db = admin.apps.length ? getFirestore() : null;

if (!db) {
    console.error("A conexão com o Firestore (db) não pôde ser estabelecida. Verifique a inicialização e as credenciais.");
}

export { db };
