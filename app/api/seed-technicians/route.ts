import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/auth/admin';
import type { Technician } from '@/lib/types/firestore';

// NOTE: This is an optional helper route. Technicians should be created manually in Firestore
// or through the admin panel. This route is kept for convenience during development.

const dummyTechnicians: Omit<Technician, 'ratingAvg' | 'ratingCount'>[] = [
  {
    name: 'John Smith',
    jobTypes: ['plumber'],
    bio: 'Experienced plumber with 15 years of expertise in residential and commercial plumbing. Specializes in leak repairs, pipe installations, and bathroom renovations.',
    tags: ['bathroom fittings', 'leak repair', 'pipe installation', 'water heater'],
    cities: ['New York', 'Brooklyn', 'Queens'],
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Sarah Johnson',
    jobTypes: ['electrician'],
    bio: 'Licensed electrician providing safe and reliable electrical services. Expert in wiring, panel upgrades, and smart home installations.',
    tags: ['AC wiring', 'panel upgrade', 'smart home', 'outlet installation'],
    cities: ['Los Angeles', 'San Francisco', 'San Diego'],
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Mike Davis',
    jobTypes: ['carpenter'],
    bio: 'Master carpenter specializing in custom furniture, cabinet making, and home renovations. Quality craftsmanship guaranteed.',
    tags: ['furniture repair', 'cabinet making', 'custom furniture', 'trim work'],
    cities: ['Chicago', 'Milwaukee', 'Detroit'],
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Emily Chen',
    jobTypes: ['plumber', 'electrician'],
    bio: 'Multi-skilled technician offering both plumbing and electrical services. Perfect for home renovation projects requiring both trades.',
    tags: ['bathroom renovation', 'kitchen wiring', 'fixture installation', 'outlet repair'],
    cities: ['Seattle', 'Portland', 'Vancouver'],
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Robert Wilson',
    jobTypes: ['plumber'],
    bio: 'Emergency plumber available 24/7. Quick response time for urgent repairs including burst pipes, clogged drains, and water leaks.',
    tags: ['emergency service', 'drain cleaning', 'burst pipe repair', 'sewer line'],
    cities: ['Miami', 'Tampa', 'Orlando'],
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Lisa Anderson',
    jobTypes: ['electrician'],
    bio: 'Residential electrician focused on safety and code compliance. Specializes in home rewiring, lighting design, and electrical troubleshooting.',
    tags: ['home rewiring', 'lighting design', 'electrical troubleshooting', 'GFCI installation'],
    cities: ['Boston', 'Cambridge', 'Worcester'],
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'David Martinez',
    jobTypes: ['carpenter'],
    bio: 'Professional carpenter with expertise in deck building, fence installation, and structural repairs. Licensed and insured.',
    tags: ['deck building', 'fence installation', 'structural repair', 'siding'],
    cities: ['Dallas', 'Houston', 'Austin'],
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Jennifer Brown',
    jobTypes: ['plumber'],
    bio: 'Female plumber providing professional plumbing services. Specializes in bathroom and kitchen installations with attention to detail.',
    tags: ['bathroom installation', 'kitchen plumbing', 'faucet repair', 'toilet installation'],
    cities: ['Phoenix', 'Tucson', 'Scottsdale'],
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'James Taylor',
    jobTypes: ['electrician', 'carpenter'],
    bio: 'Handyman offering electrical and carpentry services. Ideal for small projects and repairs around the house.',
    tags: ['handyman', 'small repairs', 'electrical fixes', 'woodwork'],
    cities: ['Denver', 'Boulder', 'Colorado Springs'],
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Amanda White',
    jobTypes: ['carpenter'],
    bio: 'Custom woodworker creating beautiful pieces for your home. From built-in shelving to custom tables, quality is guaranteed.',
    tags: ['custom woodwork', 'built-in shelving', 'custom tables', 'finishing work'],
    cities: ['Atlanta', 'Savannah', 'Augusta'],
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export async function POST() {
  try {
    await requireAdmin();

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    const batch = adminDb.batch();
    const techniciansRef = adminDb.collection('technicians');

    dummyTechnicians.forEach((tech) => {
      const docRef = techniciansRef.doc();
      batch.set(docRef, tech);
    });

    await batch.commit();

    return NextResponse.json({ 
      success: true, 
      message: `Created ${dummyTechnicians.length} technicians` 
    });
  } catch (error) {
    console.error('Error seeding technicians:', error);
    return NextResponse.json(
      { error: 'Failed to seed technicians' },
      { status: 500 }
    );
  }
}
