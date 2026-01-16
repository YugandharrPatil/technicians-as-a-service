import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Booking, Technician } from '@/lib/types/firestore';

export function useBookings(clientId: string | undefined) {
  return useQuery({
    queryKey: ['bookings', clientId],
    queryFn: async () => {
      if (!clientId || !db) return [];

      try {
        // Query without orderBy to avoid composite index requirement
        // We'll sort manually in JavaScript
        const q = query(
          collection(db, 'bookings'),
          where('clientId', '==', clientId)
        );

        const snapshot = await getDocs(q);
        type BookingWithTechnician = Booking & { id: string; technicianName?: string };
        const bookingsData: BookingWithTechnician[] = [];

        for (const docSnap of snapshot.docs) {
          const bookingData = docSnap.data() as Booking;
          const booking: BookingWithTechnician = { ...bookingData, id: docSnap.id };
          
          // Load technician name
          const techRef = doc(db, 'technicians', booking.technicianId);
          const techSnap = await getDoc(techRef);
          if (techSnap.exists()) {
            const tech = techSnap.data() as Technician;
            booking.technicianName = tech.name;
          }

          bookingsData.push(booking);
        }

        // Sort by createdAt descending (newest first)
        bookingsData.sort((a, b) => {
          const getDate = (date: Date | string | { toDate?: () => Date } | undefined): Date => {
            if (date instanceof Date) return date;
            if (typeof date === 'string') return new Date(date);
            if (date && typeof date === 'object' && 'toDate' in date && date.toDate) {
              return date.toDate();
            }
            return new Date(0);
          };

          const aDate = getDate(a.createdAt);
          const bDate = getDate(b.createdAt);
          return bDate.getTime() - aDate.getTime();
        });

        return bookingsData;
      } catch (error) {
        console.error('Error fetching bookings:', error);
        throw error;
      }
    },
    enabled: !!clientId,
  });
}
