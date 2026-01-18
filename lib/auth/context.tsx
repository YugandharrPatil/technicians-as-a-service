'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { GoogleAuthProvider } from 'firebase/auth';

const googleProvider = typeof window !== 'undefined' ? new GoogleAuthProvider() : null;
if (googleProvider) {
  googleProvider.setCustomParameters({
    prompt: 'select_account',
  });
}
import { db } from '@/lib/firebase/client';
import { doc, getDoc, setDoc } from 'firebase/firestore';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: (role?: 'client' | 'technician') => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && db) {
        // Check if user document exists, but don't create it here
        // User creation happens during sign-in with explicit role
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        // Only create if doesn't exist (for backward compatibility)
        // In normal flow, role is set during sign-in
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            email: user.email,
            displayName: user.displayName || '',
            role: 'client', // Default for backward compatibility
            createdAt: new Date(),
          });
        }
      }
      
      // Only update state if user actually changed (compare UIDs)
      setUser((prevUser) => {
        if (prevUser?.uid === user?.uid) {
          return prevUser; // Return same reference to prevent re-renders
        }
        return user;
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (role: 'client' | 'technician' = 'client') => {
    if (!auth || !googleProvider || !db) {
      throw new Error('Firebase not initialized');
    }
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Create or update user document with specified role
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // Create new user with specified role
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName || '',
        role: role,
        createdAt: new Date(),
      });
    } else {
      // Update existing user's role if it's different (for flexibility)
      const existingData = userSnap.data();
      if (existingData.role !== role) {
        await setDoc(userRef, {
          ...existingData,
          role: role,
        }, { merge: true });
      }
    }
  };

  const signOut = async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
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
