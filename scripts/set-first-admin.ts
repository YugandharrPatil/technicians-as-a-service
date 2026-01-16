import { adminAuth } from '../lib/firebase/admin';

async function setFirstAdmin() {
  // Replace with the Firebase UID of the user you want to make admin
  // You can find the UID in Firebase Console -> Authentication -> Users
  // Or get it from the user object after they sign in
  const uid = 'fZLzRL1aKSUsvwZrTDSuxFzbFW23';

  try {
    if (!adminAuth) {
      throw new Error('Admin auth not initialized');
    }

    // Verify user exists first
    const user = await adminAuth.getUser(uid);
    console.log(`📋 Found user: ${user.email || user.uid}`);

    // Set admin custom claim
    await adminAuth.setCustomUserClaims(uid, { admin: true });
    
    console.log(`✅ Successfully set admin claim for user: ${uid}`);
    console.log(`📧 Email: ${user.email || 'N/A'}`);
    console.log(`\n⚠️  Important: The user must sign out and sign back in for the changes to take effect.`);
  } catch (error) {
    console.error('❌ Error setting admin claim:', error);
    if (error instanceof Error && error.message.includes('No user record')) {
      console.error('   User not found. Make sure the UID is correct.');
    }
    process.exit(1);
  }
}

setFirstAdmin();
