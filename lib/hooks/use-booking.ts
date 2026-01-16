import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Booking, Technician } from '@/lib/types/firestore';

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      if (!id || !db) throw new Error('Booking ID is required');

      const bookingRef = doc(db, 'bookings', id);
      const bookingSnap = await getDoc(bookingRef);

      if (!bookingSnap.exists()) {
        throw new Error('Booking not found');
      }

      const booking = { ...bookingSnap.data() as Booking, id: bookingSnap.id };

      // Load technician
      const techRef = doc(db, 'technicians', booking.technicianId);
      const techSnap = await getDoc(techRef);
      let technician: (Technician & { id: string }) | null = null;
      if (techSnap.exists()) {
        technician = { ...techSnap.data() as Technician, id: techSnap.id };
      }

      return { booking, technician };
    },
    enabled: !!id,
  });
}
