'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { getIdTokenResult, getIdToken } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

type AdminGateProps = {
  children: ReactNode;
};

export function AdminGate({ children }: AdminGateProps) {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAdmin() {
      if (authLoading) return;

      if (!user) {
        router.push('/admin/login');
        return;
      }

      try {
        const tokenResult = await getIdTokenResult(user, true);
        const adminClaim = tokenResult.claims.admin;

        if (adminClaim === true) {
          // Ensure session cookie exists for API routes
          try {
            const idToken = await getIdToken(user);
            await fetch('/api/admin/create-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken }),
            });
          } catch (sessionError) {
            console.error('Error creating admin session:', sessionError);
            // Continue anyway - the user is authenticated via Firebase Auth
          }
          setIsAdmin(true);
        } else {
          router.push('/admin/login');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/admin/login');
      } finally {
        setChecking(false);
      }
    }

    checkAdmin();
  }, [user, authLoading, router]);

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
}
