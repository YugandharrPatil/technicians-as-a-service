import { useQuery } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Technician } from '@/lib/types/database';

export function useTechnician(id: string) {
  return useQuery({
    queryKey: ['technician', id],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();

      const { data, error } = await supabase
        .from('taas_technicians')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        throw new Error('Technician not found');
      }

      return data as Technician;
    },
    enabled: !!id,
  });
}
