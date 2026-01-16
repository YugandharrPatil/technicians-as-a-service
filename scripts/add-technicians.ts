import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';
import type { Technician } from '../lib/types/firestore';

// Load service account key
const serviceAccountPath = path.join(__dirname, '../lib/firebase/serviceAccountKey.json');
const serviceAccountKey = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const technicians: Omit<Technician, 'ratingAvg' | 'ratingCount'>[] = [
  {
    name: 'Alex Ramirez',
    jobTypes: ['electrician', 'maintenance'],
    bio: 'Certified electrician with 8 years of experience in residential and commercial projects.',
    tags: ['licensed', 'residential', 'commercial', 'wiring'],
    cities: ['Los Angeles', 'Pasadena', 'Glendale'],
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Brenda Lee',
    jobTypes: ['plumber'],
    bio: 'Reliable plumber specializing in leak detection, pipe repairs, and bathroom installations.',
    tags: ['plumbing', 'emergency', 'repairs'],
    cities: ['San Diego', 'La Mesa'],
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Carlos Mendoza',
    jobTypes: ['hvac'],
    bio: 'HVAC technician focused on energy-efficient heating and cooling solutions.',
    tags: ['hvac', 'air-conditioning', 'heating', 'energy-efficient'],
    cities: ['Phoenix', 'Tempe', 'Mesa'],
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Diana Novak',
    jobTypes: ['appliance_repair'],
    bio: 'Experienced in diagnosing and repairing major household appliances of all brands.',
    tags: ['appliances', 'washers', 'dryers', 'refrigerators'],
    cities: ['Chicago', 'Evanston'],
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Ethan Brooks',
    jobTypes: ['handyman', 'carpentry'],
    bio: 'Versatile handyman offering carpentry, minor repairs, and home improvement services.',
    tags: ['handyman', 'carpentry', 'home-improvement'],
    cities: ['Austin', 'Round Rock'],
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function addTechnicians() {
  try {
    // Initialize Firebase Admin
    const app = initializeApp({
      credential: cert(serviceAccountKey as any),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });

    const db = getFirestore(app);
    const batch = db.batch();
    const techniciansRef = db.collection('technicians');

    technicians.forEach((tech) => {
      const docRef = techniciansRef.doc();
      batch.set(docRef, tech);
    });

    await batch.commit();

    console.log(`✅ Successfully added ${technicians.length} technicians to Firestore!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding technicians:', error);
    process.exit(1);
  }
}

addTechnicians();
