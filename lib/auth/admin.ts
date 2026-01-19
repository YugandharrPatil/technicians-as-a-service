import { getAdminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

// Static admin email - must match client-side ADMIN_EMAIL
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@taas.com';

export async function getAdminUser() {
  try {
    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      return null;
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return null;
    }

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    // Check if email matches admin email
    if (decodedClaims.email === ADMIN_EMAIL) {
      return decodedClaims;
    }

    return null;
  } catch (error) {
    return null;
  }
}

export async function requireAdmin() {
  const adminUser = await getAdminUser();
  
  if (!adminUser) {
    throw new Error('Unauthorized: Admin access required');
  }

  return adminUser;
}
