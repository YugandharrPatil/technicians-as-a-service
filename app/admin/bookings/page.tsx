'use client';

import { useEffect, useState } from 'react';
import { AdminGate } from '@/components/auth/admin-gate';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Booking, Technician, User } from '@/lib/types/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';

export default function AdminBookingsPage() {
  return (
    <AdminGate>
      <AdminBookingsContent />
    </AdminGate>
  );
}

type BookingWithDetails = Booking & { 
  id: string; 
  technicianName?: string; 
  clientName?: string;
};

function AdminBookingsContent() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    loadBookings();
  }, [filter]);

  async function loadBookings() {
    if (!db) return;
    try {
      let q = query(
        collection(db, 'bookings'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const bookingsData: BookingWithDetails[] = [];

      for (const docSnap of snapshot.docs) {
        const bookingData = docSnap.data() as Booking;
        const booking: BookingWithDetails = { ...bookingData, id: docSnap.id };

        // Apply filter
        if (filter !== 'all' && booking.status !== filter) {
          continue;
        }

        // Load technician name
        const techRef = doc(db, 'technicians', booking.technicianId);
        const techSnap = await getDoc(techRef);
        if (techSnap.exists()) {
          const tech = techSnap.data() as Technician;
          booking.technicianName = tech.name;
        }

        // Load client name
        const userRef = doc(db, 'users', booking.clientId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const user = userSnap.data() as User;
          booking.clientName = user.displayName || user.email;
        }

        bookingsData.push(booking);
      }

      setBookings(bookingsData);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">All Bookings</h1>
        <div className="flex gap-2">
          {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              onClick={() => setFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No bookings found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const preferredDate = booking.preferredDateTime instanceof Date
              ? booking.preferredDateTime
              : typeof booking.preferredDateTime === 'string'
              ? new Date(booking.preferredDateTime)
              : booking.preferredDateTime?.toDate?.() || new Date();

            return (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{booking.serviceType}</CardTitle>
                      <CardDescription>
                        Client: {booking.clientName || 'Unknown'} | Technician: {booking.technicianName || 'Unknown'}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><strong>Address:</strong> {booking.address}</p>
                    <p><strong>Preferred Date:</strong> {preferredDate.toLocaleString()}</p>
                    <p><strong>Description:</strong> {booking.problemDescription}</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={booking.lead.contacted}
                        readOnly
                      />
                      <span>Contacted</span>
                      <input
                        type="checkbox"
                        checked={booking.lead.closed}
                        readOnly
                        className="ml-4"
                      />
                      <span>Closed</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Link href={`/admin/bookings/${booking.id}`}>
                      <Button variant="outline">Manage Booking</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
