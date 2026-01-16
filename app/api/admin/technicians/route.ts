import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/auth/admin';
import { generateEmbedding, buildEmbeddingText } from '@/lib/embeddings';
import { getPineconeIndex } from '@/lib/pinecone';
import { z } from 'zod';
import type { Technician, JobType } from '@/lib/types/firestore';

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
    try {
      await requireAdmin();
    } catch (authError) {
      console.error('Admin auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const data = technicianSchema.parse(body);

    // Create technician document
    const technicianRef = adminDb.collection('technicians').doc();
    const technicianData: Omit<Technician, 'ratingAvg' | 'ratingCount'> = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await technicianRef.set(technicianData);

    // Generate embedding and upsert to Pinecone
    try {
      const embeddingText = buildEmbeddingText({
        name: data.name,
        jobTypes: data.jobTypes,
        bio: data.bio,
        tags: data.tags,
        cities: data.cities,
      });

      const embedding = await generateEmbedding(embeddingText);
      const index = await getPineconeIndex();
      const pineconeId = `technician:${technicianRef.id}`;

      await index.upsert([
        {
          id: pineconeId,
          values: embedding,
          metadata: {
            jobTypes: data.jobTypes,
            tags: data.tags,
            cities: data.cities,
            isVisible: data.isVisible,
            technicianId: technicianRef.id,
          },
        },
      ]);

      // Update technician with embedding metadata
      await technicianRef.update({
        embedding: {
          provider: 'gemini',
          model: 'text-embedding-004',
          pineconeId,
          updatedAt: new Date(),
        },
      });
    } catch (embeddingError) {
      console.error('Error generating embedding:', embeddingError);
      // Continue even if embedding fails - mark it as failed
      await technicianRef.update({
        embedding: {
          provider: 'gemini',
          model: 'text-embedding-004',
          pineconeId: '',
          updatedAt: new Date(),
          error: 'Failed to generate embedding',
        },
      });
    }

    return NextResponse.json({ id: technicianRef.id, success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating technician:', error);
    return NextResponse.json(
      { error: 'Failed to create technician' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    const snapshot = await adminDb.collection('technicians').get();
    const technicians = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ technicians });
  } catch (error) {
    console.error('Error fetching technicians:', error);
    return NextResponse.json(
      { error: 'Failed to fetch technicians' },
      { status: 500 }
    );
  }
}
