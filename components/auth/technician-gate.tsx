'use client';

import { useEffect, useState, useRef, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type TechnicianGateProps = {
  children: ReactNode;
};

export function TechnicianGate({ children }: TechnicianGateProps) {
  const { user, loading: authLoading } = useAuth();
  const [isTechnician, setIsTechnician] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const hasCheckedRef = useRef(false);
  const checkingRef = useRef(false);
  const lastCheckedUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (lastCheckedUidRef.current === user?.id && hasCheckedRef.current) return;
    if (checkingRef.current) return;

    async function checkTechnician() {
      checkingRef.current = true;
      try {
        if (!user) {
          router.push('/technician/login');
          checkingRef.current = false;
          return;
        }

        const supabase = getSupabaseBrowserClient();

        const { data: userData } = await supabase
          .from('taas_users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userData) {
          const userRoles: string[] = userData.roles || (userData.role ? [userData.role] : []);
          const hasTechnicianRole = userRoles.includes('technician') || userData.role === 'technician';

          if (hasTechnicianRole) {
            if (pathname !== '/technician/profile') {
              const { data: techData } = await supabase
                .from('taas_technicians')
                .select('id')
                .eq('user_id', user.id)
                .single();

              if (!techData) {
                router.push('/technician/profile');
                checkingRef.current = false;
                return;
              }
            }

            lastCheckedUidRef.current = user.id;
            hasCheckedRef.current = true;
            setIsTechnician(true);
            setChecking(false);
            checkingRef.current = false;
          } else {
            router.push('/technician/login');
            checkingRef.current = false;
          }
        } else {
          router.push('/technician/login');
          checkingRef.current = false;
        }
      } catch (error) {
        console.error('Error checking technician status:', error);
        router.push('/technician/login');
        checkingRef.current = false;
      } finally {
        if (checkingRef.current) {
          checkingRef.current = false;
        }
      }
    }

    checkTechnician();
  }, [user?.id, authLoading]);

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isTechnician) {
    return null;
  }

  return <>{children}</>;
}
