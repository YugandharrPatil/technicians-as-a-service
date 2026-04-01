'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { User as DbUser, UserRole } from '@/lib/types/database';

type AuthContextType = {
  user: { id: string; email: string; displayName: string; photoURL: string | null } | null;
  dbUser: DbUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  syncUser: (role?: UserRole) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [syncing, setSyncing] = useState(false);

  const user = clerkUser
    ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        displayName: clerkUser.fullName || clerkUser.firstName || '',
        photoURL: clerkUser.imageUrl || null,
      }
    : null;

  const syncUser = useCallback(async (role?: UserRole) => {
    if (!clerkUser || syncing) return;

    setSyncing(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const userId = clerkUser.id;
      const email = clerkUser.primaryEmailAddress?.emailAddress || '';
      const displayName = clerkUser.fullName || clerkUser.firstName || '';

      // Check if user exists
      const { data: existingUser } = await supabase
        .from('taas_users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!existingUser) {
        // Create new user
        const activeRole = role || 'client';
        await supabase.from('taas_users').insert({
          id: userId,
          email,
          display_name: displayName,
          role: activeRole,
          roles: [activeRole],
        });

        const { data: newUser } = await supabase
          .from('taas_users')
          .select('*')
          .eq('id', userId)
          .single();
        setDbUser(newUser);
      } else {
        // Update existing user if role is specified
        if (role) {
          const existingRoles: string[] = existingUser.roles || (existingUser.role ? [existingUser.role] : []);
          const updatedRoles = existingRoles.includes(role)
            ? existingRoles
            : [...existingRoles, role];

          await supabase
            .from('taas_users')
            .update({
              role,
              roles: updatedRoles,
              display_name: displayName,
            })
            .eq('id', userId);

          setDbUser({ ...existingUser, role, roles: updatedRoles as UserRole[] });
        } else {
          setDbUser(existingUser);
        }
      }
    } catch (error) {
      console.error('Error syncing user:', error);
    } finally {
      setSyncing(false);
    }
  }, [clerkUser, syncing]);

  // Auto-sync user when Clerk auth state changes
  useEffect(() => {
    if (isLoaded && clerkUser) {
      syncUser();
    } else if (isLoaded && !clerkUser) {
      setDbUser(null);
    }
  }, [isLoaded, clerkUser?.id]);

  const signOut = async () => {
    setDbUser(null);
    await clerkSignOut();
  };

  const loading = !isLoaded;

  return (
    <AuthContext.Provider value={{ user, dbUser, loading, signOut, syncUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
