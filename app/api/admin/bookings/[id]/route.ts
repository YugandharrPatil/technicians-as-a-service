import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const supabase = getSupabaseServiceClient();
    const { id } = await params;
    const { status, lead } = await request.json();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updates.status = status;
    }

    if (lead) {
      if (lead.contacted !== undefined) updates.lead_contacted = lead.contacted;
      if (lead.closed !== undefined) updates.lead_closed = lead.closed;
    }

    const { error } = await supabase.from('taas_bookings').update(updates).eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}
