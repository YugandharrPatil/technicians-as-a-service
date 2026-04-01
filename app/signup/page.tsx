'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SignUp, useUser } from '@clerk/nextjs';
import { useAuth } from '@/lib/auth/context';

export default function SignUpPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const { syncUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function handlePostSignUp() {
      if (!isLoaded || !clerkUser) return;
      await syncUser('client');
      router.push('/technicians');
    }

    handlePostSignUp();
  }, [clerkUser, isLoaded]);

  if (isLoaded && clerkUser) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-muted-foreground">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <SignUp
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
