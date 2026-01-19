import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/auth/admin';
import { generateEmbedding, buildEmbeddingText } from '@/lib/embeddings';
import { getPineconeIndex } from '@/lib/pinecone';
import { z } from 'zod';
import type { Technician } from '@/lib/types/firestore';

const technicianUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  jobTypes: z.array(z.enum(['plumber', 'electrician', 'carpenter', 'maintenance', 'hvac', 'appliance_repair', 'handyman', 'carpentry'])).optional(),
  bio: z.string().min(10).optional(),
  tags: z.array(z.string()).optional(),
  cities: z.array(z.string().min(1)).optional(),
  isVisible: z.boolean().optional(),
  photoUrl: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const data = technicianUpdateSchema.parse(body);

    const technicianRef = adminDb.collection('technicians').doc(id);
    const existingDoc = await technicianRef.get();

    if (!existingDoc.exists) {
      return NextResponse.json(
        { error: 'Technician not found' },
        { status: 404 }
      );
    }

    const existingData = existingDoc.data() as Technician;
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Update fields
    if (data.name !== undefined) updates.name = data.name;
    if (data.jobTypes !== undefined) updates.jobTypes = data.jobTypes;
    if (data.bio !== undefined) updates.bio = data.bio;
    if (data.tags !== undefined) updates.tags = data.tags;
    if (data.cities !== undefined) updates.cities = data.cities;
    if (data.isVisible !== undefined) updates.isVisible = data.isVisible;
    if (data.photoUrl !== undefined) updates.photoUrl = data.photoUrl;

    await technicianRef.update(updates);

    // Regenerate embedding if any relevant fields changed
    const fieldsChanged = data.name || data.jobTypes || data.bio || data.tags || data.cities;
    if (fieldsChanged) {
      try {
        const finalData = { ...existingData, ...updates } as Technician;
        const embeddingText = buildEmbeddingText({
          name: finalData.name,
          jobTypes: finalData.jobTypes,
          bio: finalData.bio,
          tags: finalData.tags,
          cities: finalData.cities,
        });

        const embedding = await generateEmbedding(embeddingText);
        const index = await getPineconeIndex();
        const pineconeId = `technician:${id}`;

        await index.upsert([
          {
            id: pineconeId,
            values: embedding,
            metadata: {
              jobTypes: finalData.jobTypes,
              tags: finalData.tags,
              cities: finalData.cities,
              isVisible: finalData.isVisible,
              technicianId: id,
            },
          },
        ]);

        // Update embedding metadata
        await technicianRef.update({
          'embedding.pineconeId': pineconeId,
          'embedding.updatedAt': new Date(),
        });
      } catch (embeddingError) {
        console.error('Error updating embedding:', embeddingError);
        // Continue even if embedding fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating technician:', error);
    return NextResponse.json(
      { error: 'Failed to update technician' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    const { id } = await params;
    const doc = await adminDb.collection('technicians').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Technician not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching technician:', error);
    return NextResponse.json(
      { error: 'Failed to fetch technician' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    const { id } = await params;
    await adminDb.collection('technicians').doc(id).delete();

    // Optionally delete from Pinecone
    try {
      const index = await getPineconeIndex();
      await index.deleteOne(`technician:${id}`);
    } catch (error) {
      console.error('Error deleting from Pinecone:', error);
      // Continue even if Pinecone deletion fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting technician:', error);
    return NextResponse.json(
      { error: 'Failed to delete technician' },
      { status: 500 }
    );
  }
}
