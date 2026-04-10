// Client-safe admin utilities

// Static admin email - must match server-side ADMIN_EMAIL
export const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@taas.com';

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email === ADMIN_EMAIL;
}
