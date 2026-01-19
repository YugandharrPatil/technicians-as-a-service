'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Chrome } from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { doc, getDoc } from 'firebase/firestore';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const { signInWithGoogle, user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Check if user is already logged in and redirect if so
  useEffect(() => {
    async function checkAuthStatus() {
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
          
          // If user has client role (either current or in roles array), redirect to technicians page
          if (userData.role === 'client' || userRoles.includes('client')) {
            router.push('/technicians');
            return;
          } else if (userData.role === 'technician' || userRoles.includes('technician')) {
            // User has technician role but logged in via client login - redirect to technician login
            // They can then log in as technician which will set their current role
            router.push('/technician/login');
            return;
          }
        }
      } catch (err) {
        console.error('Error checking auth status:', err);
      }
      
      setChecking(false);
    }

    checkAuthStatus();
  }, [user, authLoading, router]);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle('client');
      // Wait a bit for auth state to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Redirect to technicians page after successful login
      router.push('/technicians');
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
          <CardTitle>Client Sign In</CardTitle>
          <CardDescription>Sign in with your Google account to browse and book technicians</CardDescription>
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
