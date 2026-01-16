import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/auth/admin';

export async function POST(request: NextRequest) {
  try {
    // Only existing admins can set admin claims
    await requireAdmin();

    if (!adminAuth) {
      return NextResponse.json(
        { error: 'Auth not initialized' },
        { status: 500 }
      );
    }

    const { uid } = await request.json();

    if (!uid) {
      return NextResponse.json({ error: 'UID is required' }, { status: 400 });
    }

    await adminAuth.setCustomUserClaims(uid, { admin: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting admin claim:', error);
    return NextResponse.json(
      { error: 'Failed to set admin claim' },
      { status: 500 }
    );
  }
}
