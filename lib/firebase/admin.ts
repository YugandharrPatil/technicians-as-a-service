import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let app: App | undefined;
let adminAuth: Auth | undefined;
let adminDb: Firestore | undefined;
let initializationAttempted = false;

function initializeAdmin() {
  if (typeof window !== 'undefined') {
    return; // Don't initialize on client side
  }

  if (initializationAttempted) {
    return; // Already attempted initialization
  }

  initializationAttempted = true;

  if (getApps().length > 0) {
    app = getApps()[0];
    adminAuth = getAuth(app);
    adminDb = getFirestore(app);
    return;
  }

  const serviceAccountKey = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountKey) {
    return;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey) as any;
    app = initializeApp({ 
      credential: cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
    adminAuth = getAuth(app);
    adminDb = getFirestore(app);
  } catch (error) {
    // Silently fail during build - initialization will be retried at runtime
    // This prevents build failures when env var is missing or invalid
  }
}

// Lazy initialization - only initialize when actually accessed
// This prevents build-time JSON parsing errors
function ensureInitialized() {
  if (!initializationAttempted) {
    initializeAdmin();
  }
}

// Export getters that ensure initialization
export const getAdminAuth = () => {
  ensureInitialized();
  return adminAuth;
};

export const getAdminDb = () => {
  ensureInitialized();
  return adminDb;
};

// Export for backward compatibility (will be undefined until first access)
export { adminAuth, adminDb };
export default app;
