'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { getIdTokenResult, getIdToken } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Chrome } from 'lucide-react';

export default function AdminLoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle, user } = useAuth();
  const router = useRouter();

  // Check if user is already logged in and is admin, redirect if so
  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) return;

      try {
        const tokenResult = await getIdTokenResult(user, true);
        if (tokenResult.claims.admin === true) {
          router.push('/admin/dashboard');
        }
      } catch (err) {
        // User is not admin or error checking
        console.error('Error checking admin status:', err);
      }
    }

    checkAdminStatus();
  }, [user, router]);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
      
      // Wait a bit for auth state to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get the current user and check admin claim
      if (!auth) {
        setError('Authentication not initialized');
        return;
      }

      const currentUser = auth.currentUser;
      if (currentUser) {
        const tokenResult = await getIdTokenResult(currentUser, true);
        const adminClaim = tokenResult.claims.admin;

        if (adminClaim === true) {
          // Create admin session cookie for API routes
          try {
            const idToken = await getIdToken(currentUser);
            const sessionResponse = await fetch('/api/admin/create-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken }),
            });

            if (!sessionResponse.ok) {
              console.error('Failed to create admin session');
            }
          } catch (sessionError) {
            console.error('Error creating admin session:', sessionError);
            // Continue anyway - the user is authenticated via Firebase Auth
          }

          router.push('/admin/dashboard');
        } else {
          setError('You do not have admin access. Please contact an administrator.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Sign In</CardTitle>
          <CardDescription>Sign in with your Google account</CardDescription>
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
