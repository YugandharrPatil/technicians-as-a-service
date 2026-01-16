import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import serviceAccountKey from '@/lib/firebase/serviceAccountKey.json';

let app: App | undefined;
let adminAuth: Auth | undefined;
let adminDb: Firestore | undefined;

if (typeof window === 'undefined') {
  if (getApps().length === 0) {
    // const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY
    const serviceAccount = serviceAccountKey as any;

    if (!serviceAccount) {
      throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY is not set');
    }

    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } else {
    app = getApps()[0];
  }

  adminAuth = getAuth(app);
  adminDb = getFirestore(app);
}

export { adminAuth, adminDb };
export default app;
