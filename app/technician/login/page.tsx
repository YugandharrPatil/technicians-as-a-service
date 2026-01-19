'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { db } from '@/lib/firebase/client';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Chrome } from 'lucide-react';

export default function TechnicianLoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const { signInWithGoogle, user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Check if user is already logged in and is technician, redirect if so
  useEffect(() => {
    async function checkTechnicianStatus() {
      if (authLoading) return;
      
      if (!user || !db) {
        setChecking(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const userRoles = userData.roles || (userData.role ? [userData.role] : []);
          
          // Check if user has technician role (either current or in roles array)
          if (userData.role === 'technician' || userRoles.includes('technician')) {
            // Check if technician profile exists
            const techniciansQuery = query(
              collection(db, 'technicians'),
              where('userId', '==', user.uid)
            );
            const techniciansSnapshot = await getDocs(techniciansQuery);
            
            if (techniciansSnapshot.empty) {
              // No profile, redirect to profile creation
              router.push('/technician/profile');
            } else {
              // Profile exists, go to dashboard
              router.push('/technician/dashboard');
            }
            return; // Don't show login page
          } else if (userData.role === 'client' || userRoles.includes('client')) {
            // User has client role but logged in via technician login
            // They can still log in as technician which will add technician role
            // But if they're already logged in as client, we'll let them proceed
          }
        }
      } catch (err) {
        console.error('Error checking technician status:', err);
      }
      
      setChecking(false);
    }

    checkTechnicianStatus();
  }, [user, authLoading, router]);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle('technician');
      
      // Wait a bit for auth state to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // The useEffect will handle the redirect after user state updates
      // For now, just wait - the redirect logic is in the useEffect above
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth status
  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Technician Sign In</CardTitle>
          <CardDescription>Sign in with your Google account to access your technician dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}
            <Button 
              type="button" 
              className="w-full" 
              disabled={loading}
              onClick={handleGoogleSignIn}
            >
              <Chrome className="mr-2 h-4 w-4" />
              {loading ? 'Signing in...' : 'Sign in with Google'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
