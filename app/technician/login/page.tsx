'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SignIn, useUser } from '@clerk/nextjs';
import { useAuth } from '@/lib/auth/context';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function TechnicianLoginPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const { syncUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function handlePostSignIn() {
      if (!isLoaded || !clerkUser) return;

      // Sync user with 'technician' role
      await syncUser('technician');

      const supabase = getSupabaseBrowserClient();
      const { data: userData } = await supabase
        .from('taas_users')
        .select('*')
        .eq('id', clerkUser.id)
        .single();

      if (userData) {
        const userRoles: string[] = userData.roles || (userData.role ? [userData.role] : []);

        if (userData.role === 'technician' || userRoles.includes('technician')) {
          // Check if technician profile exists
          const { data: techData } = await supabase
            .from('taas_technicians')
            .select('id')
            .eq('user_id', clerkUser.id)
            .single();

          if (!techData) {
            router.push('/technician/profile');
          } else {
            router.push('/technician/dashboard');
          }
          return;
        }
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
