'use client';

import { useEffect, useState, useRef, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { db } from '@/lib/firebase/client';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

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
    // Early returns - don't proceed if conditions aren't met
    if (authLoading) {
      return;
    }
    
    // If we've already checked this exact UID and confirmed, skip
    if (lastCheckedUidRef.current === user?.uid && hasCheckedRef.current) {
      return;
    }
    
    // Prevent concurrent checks
    if (checkingRef.current) {
      return;
    }
    
    async function checkTechnician() {
      checkingRef.current = true;
      try {
        if (!user) {
          router.push('/technician/login');
          checkingRef.current = false;
          return;
        }

        if (!db) {
          setChecking(false);
          checkingRef.current = false;
          return;
        }
        
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          
          if (userData.role === 'technician') {
            // Check if technician profile exists (unless on profile page)
            if (pathname !== '/technician/profile') {
              const techniciansQuery = query(
                collection(db, 'technicians'),
                where('userId', '==', user.uid)
              );
              const techniciansSnapshot = await getDocs(techniciansQuery);
              
              if (techniciansSnapshot.empty) {
                // No profile, redirect to profile creation
                router.push('/technician/profile');
                checkingRef.current = false;
                return;
              }
            }
            
            lastCheckedUidRef.current = user.uid;
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
  }, [user?.uid, authLoading]);

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
