import { NextRequest, NextResponse } from 'next/server';
import { requireTechnician } from '@/lib/auth/technician';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
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
    try { decodedToken = await requireTechnician(); } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const uid = decodedToken.uid;
    const supabase = getSupabaseServiceClient();

    // Check if user is a technician
    const { data: userData } = await supabase.from('taas_users').select('*').eq('id', uid).single();
    if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (userData.role !== 'technician') return NextResponse.json({ error: 'User is not a technician' }, { status: 403 });

    // Check if technician profile already exists
    const { data: existingTech } = await supabase.from('taas_technicians').select('id').eq('user_id', uid).single();
    if (existingTech) return NextResponse.json({ error: 'Technician profile already exists. Use PUT to update.' }, { status: 400 });

    const body = await request.json();
    const validatedData = technicianSchema.parse(body);

    const { data: newTech, error } = await supabase.from('taas_technicians').insert({
      user_id: uid,
      name: validatedData.name,
      job_types: validatedData.jobTypes,
      bio: validatedData.bio,
      tags: validatedData.tags,
      cities: validatedData.cities,
      is_visible: validatedData.isVisible,
      photo_url: validatedData.photoUrl,
    }).select('id').single();

    if (error || !newTech) return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });

    return NextResponse.json({ id: newTech.id, message: 'Technician profile created successfully' });
  } catch (error) {
    console.error('Error creating technician profile:', error);
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Validation error', issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create technician profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    let decodedToken;
    try { decodedToken = await requireTechnician(); } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const uid = decodedToken.uid;
    const supabase = getSupabaseServiceClient();

    const { data: userData } = await supabase.from('taas_users').select('*').eq('id', uid).single();
    if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (userData.role !== 'technician') return NextResponse.json({ error: 'User is not a technician' }, { status: 403 });

    const { data: existingTech } = await supabase.from('taas_technicians').select('id').eq('user_id', uid).single();
    if (!existingTech) return NextResponse.json({ error: 'Technician profile not found. Use POST to create.' }, { status: 404 });

    const body = await request.json();
    const validatedData = technicianSchema.parse(body);

    const { error } = await supabase.from('taas_technicians').update({
      name: validatedData.name,
      job_types: validatedData.jobTypes,
      bio: validatedData.bio,
      tags: validatedData.tags,
      cities: validatedData.cities,
      is_visible: validatedData.isVisible,
      photo_url: validatedData.photoUrl,
      updated_at: new Date().toISOString(),
    }).eq('id', existingTech.id);

    if (error) return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });

    return NextResponse.json({ id: existingTech.id, message: 'Technician profile updated successfully' });
  } catch (error) {
    console.error('Error updating technician profile:', error);
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Validation error', issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update technician profile' }, { status: 500 });
  }
}
