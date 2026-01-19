import { NextRequest, NextResponse } from 'next/server';
import { createAdminSession } from '@/lib/auth/admin-session';
import { ADMIN_EMAIL } from '@/lib/auth/admin';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: 'ID token is required' },
        { status: 400 }
      );
    }

    // Verify the token and check if email matches admin email
    const { getAdminAuth } = await import('@/lib/firebase/admin');
    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      return NextResponse.json(
        { error: 'Admin auth not initialized' },
        { status: 500 }
      );
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Check if email matches admin email
    if (decodedToken.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    await createAdminSession(idToken);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating admin session:', error);
    return NextResponse.json(
      { error: 'Failed to create admin session' },
      { status: 500 }
    );
  }
}
