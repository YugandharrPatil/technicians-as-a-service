import { useQuery } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Booking } from '@/lib/types/database';

export function useBookings(clientId: string | undefined) {
  return useQuery({
    queryKey: ['bookings', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const supabase = getSupabaseBrowserClient();

      const { data: bookings, error } = await supabase
        .from('taas_bookings')
        .select('*, taas_technicians(name)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        throw error;
      }

      type BookingWithTechnician = Booking & { technician_name?: string };

      return (bookings || []).map((b: any) => ({
        ...b,
        technician_name: b.taas_technicians?.name,
      })) as BookingWithTechnician[];
    },
    enabled: !!clientId,
  });
}
