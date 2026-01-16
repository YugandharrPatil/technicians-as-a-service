import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Technician } from '@/lib/types/firestore';

export function useTechnician(id: string) {
  return useQuery({
    queryKey: ['technician', id],
    queryFn: async () => {
      if (!db) throw new Error('Database not initialized');
      const docRef = doc(db, 'technicians', id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Technician not found');
      }

      return { ...docSnap.data() as Technician, id: docSnap.id } as Technician & { id: string };
    },
    enabled: !!id,
  });
}
