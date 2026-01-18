import { NextRequest, NextResponse } from 'next/server';
import { requireTechnician } from '@/lib/auth/technician';
import { adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';

const technicianSchema = z.object({
  name: z.string().min(1),
  jobTypes: z.array(z.enum(['plumber', 'electrician', 'carpenter', 'maintenance', 'hvac', 'appliance_repair', 'handyman', 'carpentry'])),
  bio: z.string().min(10),
  tags: z.array(z.string()),
  cities: z.array(z.string().min(1)),
  isVisible: z.boolean(),
  photoUrl: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    let decodedToken;
    try {
      decodedToken = await requireTechnician(request);
    } catch (authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const uid = decodedToken.uid;

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    // Check if user is a technician
    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userSnap.data();
    if (userData?.role !== 'technician') {
      return NextResponse.json({ error: 'User is not a technician' }, { status: 403 });
    }

    // Check if technician profile already exists
    const techniciansSnapshot = await adminDb
      .collection('technicians')
      .where('userId', '==', uid)
      .get();
    
    if (!techniciansSnapshot.empty) {
      return NextResponse.json({ error: 'Technician profile already exists. Use PUT to update.' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = technicianSchema.parse(body);

    const technicianData = {
      userId: uid,
      name: validatedData.name,
      jobTypes: validatedData.jobTypes,
      bio: validatedData.bio,
      tags: validatedData.tags,
      cities: validatedData.cities,
      isVisible: validatedData.isVisible,
      photoUrl: validatedData.photoUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await adminDb.collection('technicians').add(technicianData);

    return NextResponse.json({ id: docRef.id, message: 'Technician profile created successfully' });
  } catch (error) {
    console.error('Error creating technician profile:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create technician profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    let decodedToken;
    try {
      decodedToken = await requireTechnician(request);
    } catch (authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const uid = decodedToken.uid;

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    // Check if user is a technician
    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userSnap.data();
    if (userData?.role !== 'technician') {
      return NextResponse.json({ error: 'User is not a technician' }, { status: 403 });
    }

    // Find existing technician profile
    const techniciansSnapshot = await adminDb
      .collection('technicians')
      .where('userId', '==', uid)
      .get();
    
    if (techniciansSnapshot.empty) {
      return NextResponse.json({ error: 'Technician profile not found. Use POST to create.' }, { status: 404 });
    }

    const technicianDoc = techniciansSnapshot.docs[0];
    const technicianRef = adminDb.collection('technicians').doc(technicianDoc.id);

    const body = await request.json();
    const validatedData = technicianSchema.parse(body);

    const updateData = {
      name: validatedData.name,
      jobTypes: validatedData.jobTypes,
      bio: validatedData.bio,
      tags: validatedData.tags,
      cities: validatedData.cities,
      isVisible: validatedData.isVisible,
      photoUrl: validatedData.photoUrl,
      updatedAt: new Date(),
    };

    await technicianRef.update(updateData);

    return NextResponse.json({ id: technicianDoc.id, message: 'Technician profile updated successfully' });
  } catch (error) {
    console.error('Error updating technician profile:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update technician profile' },
      { status: 500 }
    );
  }
}
