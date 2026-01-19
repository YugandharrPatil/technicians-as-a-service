'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, getIdToken } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/context';
import { ADMIN_EMAIL } from '@/lib/auth/admin-client';

// Static admin password
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  // Check if user is already logged in and is admin, redirect if so
  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) return;

      try {
        // Check if logged in user is admin by email
        if (user.email === ADMIN_EMAIL) {
          router.push('/admin/dashboard');
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
      }
    }

    checkAdminStatus();
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!auth) {
        setError('Authentication not initialized');
        return;
      }

      // Validate credentials match admin credentials
      if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        setError('Invalid admin credentials');
        setLoading(false);
        return;
      }

      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Create admin session cookie for API routes
      try {
        const idToken = await getIdToken(userCredential.user);
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
      
      // Wait a bit for auth state to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      router.push('/admin/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found') {
        // User doesn't exist, create it first (for portfolio purposes)
        setError('Admin account not found. Please create the admin account in Firebase Console first.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Invalid password');
      } else {
        setError(err.message || 'Failed to sign in');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Sign In</CardTitle>
          <CardDescription>Enter your admin credentials to access the admin dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@taas.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <div className="text-xs text-muted-foreground text-center pt-2">
              Default credentials: admin@taas.com / admin123
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
