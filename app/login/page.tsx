'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SignIn, useUser } from '@clerk/nextjs';
import { useAuth } from '@/lib/auth/context';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const { syncUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function handlePostSignIn() {
      if (!isLoaded || !clerkUser) return;

      // Sync user with 'client' role
      await syncUser('client');

      // Check user roles and redirect
      const supabase = getSupabaseBrowserClient();
      const { data: userData } = await supabase
        .from('taas_users')
        .select('*')
        .eq('id', clerkUser.id)
        .single();

      if (userData) {
        const userRoles: string[] = userData.roles || (userData.role ? [userData.role] : []);
        if (userData.role === 'client' || userRoles.includes('client')) {
          router.push('/technicians');
        } else if (userData.role === 'technician' || userRoles.includes('technician')) {
          router.push('/technician/login');
        }
      } else {
        router.push('/technicians');
      }
    }

    handlePostSignIn();
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
