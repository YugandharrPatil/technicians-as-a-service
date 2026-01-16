import { adminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export async function getAdminUser() {
  try {
    if (!adminAuth) {
      return null;
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return null;
    }

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    if (decodedClaims.admin === true) {
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
