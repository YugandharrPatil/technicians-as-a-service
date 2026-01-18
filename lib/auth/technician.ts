import { adminAuth } from '@/lib/firebase/admin';
import { NextRequest } from 'next/server';

export async function getTechnicianUser(request: NextRequest) {
  try {
    if (!adminAuth) {
      return null;
    }

    // Get Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    return decodedToken;
  } catch (error) {
    console.error('Error verifying technician token:', error);
    return null;
  }
}

export async function requireTechnician(request: NextRequest) {
  const technicianUser = await getTechnicianUser(request);
  
  if (!technicianUser) {
    throw new Error('Unauthorized: Technician access required');
  }

  return technicianUser;
}
