import { currentUser } from '@clerk/nextjs/server';

export async function getTechnicianUser() {
  try {
    const user = await currentUser();
    if (!user) return null;

    return {
      uid: user.id,
      email: user.primaryEmailAddress?.emailAddress || '',
    };
  } catch {
    return null;
  }
}

export async function requireTechnician() {
  const technicianUser = await getTechnicianUser();
  if (!technicianUser) {
    throw new Error('Unauthorized: Technician access required');
  }
  return technicianUser;
}
