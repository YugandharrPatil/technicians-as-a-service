import { useQuery } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Booking } from '@/lib/types/database';

export function useTechnicianBookings(userId: string | undefined) {
  return useQuery({
    queryKey: ['technician-bookings', userId],
    queryFn: async () => {
      if (!userId) return [];

      const supabase = getSupabaseBrowserClient();

      // Find the technician document for this user
      const { data: technician } = await supabase
        .from('taas_technicians')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!technician) return [];

      // Query bookings for this technician, joining users for client info
      const { data: bookings, error } = await supabase
        .from('taas_bookings')
        .select('*, taas_users(display_name, email)')
        .eq('technician_id', technician.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching technician bookings:', error);
        throw error;
      }

      type BookingWithDetails = Booking & {
        client_name?: string;
        client_email?: string;
      };

      return (bookings || []).map((b: any) => ({
        ...b,
        client_name: b.taas_users?.display_name,
        client_email: b.taas_users?.email,
      })) as BookingWithDetails[];
    },
    enabled: !!userId,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
