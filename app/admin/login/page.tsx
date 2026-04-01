'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SignIn, useUser } from '@clerk/nextjs';
import { ADMIN_EMAIL } from '@/lib/auth/admin-client';

export default function AdminLoginPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !clerkUser) return;

    const email = clerkUser.primaryEmailAddress?.emailAddress;
    if (email === ADMIN_EMAIL) {
      router.push('/admin/dashboard');
    }
  }, [clerkUser, isLoaded, router]);

  if (isLoaded && clerkUser) {
    const email = clerkUser.primaryEmailAddress?.emailAddress;
    if (email === ADMIN_EMAIL) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="text-muted-foreground">Redirecting to dashboard...</div>
        </div>
      );
    }
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <p className="text-destructive mb-2">Your account does not have admin access.</p>
          <p className="text-muted-foreground text-sm">Signed in as: {email}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <SignIn
        routing="hash"
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-lg',
          },
        }}
      />
    </div>
  );
}
