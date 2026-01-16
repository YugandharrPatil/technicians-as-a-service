import { adminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export async function createAdminSession(idToken: string) {
  if (!adminAuth) {
    throw new Error('Admin auth not initialized');
  }

  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn,
  });

  const cookieStore = await cookies();
  cookieStore.set('session', sessionCookie, {
    maxAge: expiresIn,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}

export async function revokeAdminSession() {
  if (!adminAuth) {
    return;
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  if (sessionCookie) {
    try {
      const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
      await adminAuth.revokeRefreshTokens(decodedClaims.uid);
    } catch (error) {
      // Session already invalid
    }
  }

  cookieStore.delete('session');
}
