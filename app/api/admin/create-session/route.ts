import { NextRequest, NextResponse } from 'next/server';
import { createAdminSession } from '@/lib/auth/admin-session';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: 'ID token is required' },
        { status: 400 }
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
