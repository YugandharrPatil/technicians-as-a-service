'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { isAdminEmail } from '@/lib/auth/admin-client';

type AdminGateProps = {
  children: ReactNode;
};

export function AdminGate({ children }: AdminGateProps) {
  const { user, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push('/admin/login');
      return;
    }

    const email = user.primaryEmailAddress?.emailAddress;
    if (isAdminEmail(email)) {
      setIsAdmin(true);
    } else {
      router.push('/admin/login');
    }

    setChecking(false);
  }, [user, isLoaded, router]);

  if (!isLoaded || checking) {
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
