import { currentUser } from '@clerk/nextjs/server';

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@taas.com';

export async function getAdminUser() {
  try {
    const user = await currentUser();
    if (!user) return null;

    const email = user.primaryEmailAddress?.emailAddress;
    if (email === ADMIN_EMAIL) {
      return {
        uid: user.id,
        email,
      };
    }

    return null;
  } catch {
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
