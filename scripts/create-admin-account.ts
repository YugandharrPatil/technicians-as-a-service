/**
 * Script to create admin account in Firebase Auth
 * Run this script once to create the admin account:
 * 
 * pnpm tsx scripts/create-admin-account.ts
 * 
 * Or create the account manually in Firebase Console:
 * 1. Go to Firebase Console > Authentication > Users
 * 2. Click "Add user"
 * 3. Email: admin@taas.com
 * 4. Password: admin123 (or your custom password)
 * 5. Make sure to set NEXT_PUBLIC_ADMIN_PASSWORD env var if using custom password
 */

import { adminAuth } from '../lib/firebase/admin';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@taas.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';

async function createAdminAccount() {
  try {
    if (!adminAuth) {
      throw new Error('Admin auth not initialized');
    }

    // Check if admin user already exists
    try {
      const existingUser = await adminAuth.getUserByEmail(ADMIN_EMAIL);
      console.log(`Admin account already exists: ${ADMIN_EMAIL}`);
      console.log(`UID: ${existingUser.uid}`);
      return;
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Create new admin user
    const userRecord = await adminAuth.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      emailVerified: true,
    });

    console.log('Admin account created successfully!');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`UID: ${userRecord.uid}`);
    console.log('\nYou can now log in with these credentials at /admin/login');
  } catch (error) {
    console.error('Error creating admin account:', error);
    process.exit(1);
  }
}

createAdminAccount();
