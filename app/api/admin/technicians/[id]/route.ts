import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { generateEmbedding, buildEmbeddingText } from '@/lib/embeddings';
import { getPineconeIndex } from '@/lib/pinecone';
import { z } from 'zod';

const technicianUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  jobTypes: z.array(z.enum(['plumber', 'electrician', 'carpenter', 'maintenance', 'hvac', 'appliance_repair', 'handyman', 'carpentry'])).optional(),
  bio: z.string().min(10).optional(),
  tags: z.array(z.string()).optional(),
  cities: z.array(z.string().min(1)).optional(),
  isVisible: z.boolean().optional(),
  photoUrl: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const supabase = getSupabaseServiceClient();
    const { id } = await params;
    const body = await request.json();
    const data = technicianUpdateSchema.parse(body);

    const { data: existing, error: fetchError } = await supabase.from('taas_technicians').select('*').eq('id', id).single();
    if (fetchError || !existing) return NextResponse.json({ error: 'Technician not found' }, { status: 404 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.jobTypes !== undefined) updates.job_types = data.jobTypes;
    if (data.bio !== undefined) updates.bio = data.bio;
    if (data.tags !== undefined) updates.tags = data.tags;
    if (data.cities !== undefined) updates.cities = data.cities;
    if (data.isVisible !== undefined) updates.is_visible = data.isVisible;
    if (data.photoUrl !== undefined) updates.photo_url = data.photoUrl;

    await supabase.from('taas_technicians').update(updates).eq('id', id);

    const fieldsChanged = data.name || data.jobTypes || data.bio || data.tags || data.cities;
    if (fieldsChanged) {
      try {
        const finalData = { ...existing, ...updates };
        const embeddingText = buildEmbeddingText({
          name: finalData.name as string,
          jobTypes: (finalData.job_types || finalData.jobTypes) as string[],
          bio: finalData.bio as string,
          tags: finalData.tags as string[],
          cities: finalData.cities as string[],
        });
        const embedding = await generateEmbedding(embeddingText);
        const index = await getPineconeIndex();
        const pineconeId = `technician:${id}`;
        await index.upsert([{
          id: pineconeId, values: embedding,
          metadata: { jobTypes: finalData.job_types || finalData.jobTypes, tags: finalData.tags, cities: finalData.cities, isVisible: finalData.is_visible ?? true, technicianId: id },
        }]);
        const embeddingMeta = existing.embedding || {};
        await supabase.from('taas_technicians').update({
          embedding: { ...embeddingMeta, pineconeId, updatedAt: new Date().toISOString() },
        }).eq('id', id);
      } catch (embeddingError) {
        console.error('Error updating embedding:', embeddingError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    console.error('Error updating technician:', error);
    return NextResponse.json({ error: 'Failed to update technician' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const supabase = getSupabaseServiceClient();
    const { id } = await params;
    const { data, error } = await supabase.from('taas_technicians').select('*').eq('id', id).single();
    if (error || !data) return NextResponse.json({ error: 'Technician not found' }, { status: 404 });
    return NextResponse.json({ id: data.id, ...data });
  } catch (error) {
    console.error('Error fetching technician:', error);
    return NextResponse.json({ error: 'Failed to fetch technician' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const supabase = getSupabaseServiceClient();
    const { id } = await params;
    await supabase.from('taas_technicians').delete().eq('id', id);
    try {
      const index = await getPineconeIndex();
      await index.deleteOne(`technician:${id}`);
    } catch (error) { console.error('Error deleting from Pinecone:', error); }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting technician:', error);
    return NextResponse.json({ error: 'Failed to delete technician' }, { status: 500 });
  }
}
