'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { isAdminEmail } from '@/lib/auth/admin-client';

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

      // Check if user email matches admin email
      if (isAdminEmail(user.email)) {
        setIsAdmin(true);
      } else {
        router.push('/admin/login');
      }
      
      setChecking(false);
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
