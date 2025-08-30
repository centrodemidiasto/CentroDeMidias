import admin from 'firebase-admin';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Variável global para armazenar a instância do admin app
let app: admin.app.App | undefined = undefined;

function getAdminApp(): admin.app.App {
  if (app) {
    return app;
  }

  // Verifica se as credenciais estão disponíveis nas variáveis de ambiente
  // No Next.js, as variáveis de ambiente do lado do servidor precisam ser acessadas diretamente.
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const projectId = process.env.GOOGLE_PROJECT_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (admin.apps.length > 0) {
      app = admin.apps[0]!;
      return app;
  }

  if (projectId && privateKey && clientEmail) {
    try {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          privateKey: privateKey,
          clientEmail: clientEmail,
        }),
        databaseURL: `https://${projectId}.firebaseio.com`
      });
      console.log("Firebase Admin SDK inicializado com sucesso.");
      return app;
    } catch (error: any) {
      console.error('Erro na inicialização do Firebase Admin SDK:', error.stack);
      throw new Error("Falha na inicialização do Firebase Admin. Verifique as credenciais.");
    }
  } else {
    // Log detalhado para depuração
    console.error("Credenciais do Firebase Admin SDK não encontradas ou incompletas.");
    console.error(`GOOGLE_PROJECT_ID: ${!!projectId}`);
    console.error(`GOOGLE_PRIVATE_KEY: ${!!privateKey}`);
    console.error(`GOOGLE_SERVICE_ACCOUNT_EMAIL: ${!!clientEmail}`);
    throw new Error("Credenciais do Firebase Admin SDK não configuradas nas variáveis de ambiente.");
  }
}

// Exporta uma instância do DB que pode ser nula se a inicialização falhar.
// As funções que usam 'db' devem verificar se é nulo.
let db: Firestore | null = null;
try {
    getAdminApp();
    db = getFirestore();
} catch (e) {
    console.error("Não foi possível obter a instância do Firestore. O app pode não ter sido inicializado.", e);
}


export { db };
