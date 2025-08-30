import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  try {
    // As credenciais são lidas das variáveis de ambiente pelo SDK
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.GOOGLE_PROJECT_ID,
        clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        // A chave privada precisa ter as quebras de linha substituídas
        privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: `https://${process.env.GOOGLE_PROJECT_ID}.firebaseio.com`,
    });
    console.log("Firebase Admin SDK inicializado com sucesso.");
  } catch (error: any) {
    console.error("Erro ao inicializar Firebase Admin SDK. Verifique as variáveis de ambiente.", error.message);
  }
}

const db = getFirestore();

export { db };
