import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Booking, Technician, User } from '@/lib/types/firestore';

export function useTechnicianBookings(userId: string | undefined) {
  return useQuery({
    queryKey: ['technician-bookings', userId],
    queryFn: async () => {
      if (!userId || !db) return [];

      try {
        // First, find the technician document for this user
        const techniciansQuery = query(
          collection(db, 'technicians'),
          where('userId', '==', userId)
        );
        const techniciansSnapshot = await getDocs(techniciansQuery);
        
        if (techniciansSnapshot.empty) {
          return [];
        }

        // Get the technician ID (assuming one technician per user)
        const technicianDoc = techniciansSnapshot.docs[0];
        const technicianId = technicianDoc.id;

        // Query bookings for this technician
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('technicianId', '==', technicianId)
        );

        const snapshot = await getDocs(bookingsQuery);
        
        type BookingWithDetails = Booking & { 
          id: string; 
          clientName?: string;
          clientEmail?: string;
        };
        const bookingsData: BookingWithDetails[] = [];

        for (const docSnap of snapshot.docs) {
          const bookingData = docSnap.data() as Booking;
          const booking: BookingWithDetails = { ...bookingData, id: docSnap.id };
          
          // Load client name
          const clientRef = doc(db, 'users', booking.clientId);
          const clientSnap = await getDoc(clientRef);
          if (clientSnap.exists()) {
            const client = clientSnap.data() as User;
            booking.clientName = client.displayName || client.email;
            booking.clientEmail = client.email;
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
        console.error('Error fetching technician bookings:', error);
        throw error;
      }
    },
    enabled: !!userId,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // 5 minutes - prevent frequent refetches
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
  });
}
