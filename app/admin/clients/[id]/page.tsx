'use client';

import { use } from 'react';
import { useEffect, useState } from 'react';
import { AdminGate } from '@/components/auth/admin-gate';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { User, Booking, Technician } from '@/lib/types/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function AdminClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AdminGate>
      <AdminClientDetailContent id={id} />
    </AdminGate>
  );
}

type BookingWithTechnician = Booking & { 
  id: string; 
  technicianName?: string;
};

function AdminClientDetailContent({ id }: { id: string }) {
  const [client, setClient] = useState<(User & { id: string }) | null>(null);
  const [bookings, setBookings] = useState<BookingWithTechnician[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClient();
  }, [id]);

  async function loadClient() {
    if (!db) return;
    try {
      const userRef = doc(db, 'users', id);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setClient({ ...userSnap.data() as User, id: userSnap.id });

        // Load bookings
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('clientId', '==', id)
        );
        const bookingsSnap = await getDocs(bookingsQuery);
        const bookingsData: BookingWithTechnician[] = [];

        for (const docSnap of bookingsSnap.docs) {
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

        setBookings(bookingsData);
      }
    } catch (error) {
      console.error('Error loading client:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (!client) {
    return <div className="container mx-auto p-4">Client not found</div>;
  }

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <Link href="/admin/clients" className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground">
        ← Back to Clients
      </Link>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Client Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Name:</strong> {client.displayName || 'No Name'}</p>
            <p><strong>Email:</strong> {client.email}</p>
            <p><strong>Role:</strong> {client.role}</p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 text-2xl font-bold">Booking History</h2>
        {bookings.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No bookings found for this client.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{booking.serviceType}</CardTitle>
                      <CardDescription>
                        {booking.technicianName || 'Unknown Technician'}
                      </CardDescription>
                    </div>
                    <Badge>{booking.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link href={`/admin/bookings/${booking.id}`}>
                    <button className="text-primary underline">View Booking</button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
