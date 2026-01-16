'use client';

import { useAuth } from '@/lib/auth/context';
import { AuthGate } from '@/components/auth/auth-gate';
import type { Booking } from '@/lib/types/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Calendar, MapPin } from 'lucide-react';
import { useBookings } from '@/lib/hooks/use-bookings';

export default function BookingsPage() {
  return (
    <AuthGate>
      <BookingsContent />
    </AuthGate>
  );
}

function BookingsContent() {
  const { user } = useAuth();
  const { data: bookings = [], isLoading, error } = useBookings(user?.uid);

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

  if (isLoading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (error) {
    console.error('Bookings error:', error);
    return (
      <div className="container mx-auto p-4">
        <div className="text-destructive">
          Error loading bookings. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-3xl font-bold">My Bookings</h1>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No bookings yet. <Link href="/technicians" className="text-primary underline">Browse technicians</Link> to get started.
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
                        {booking.technicianName || 'Loading...'}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{preferredDate.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Link href={`/booking/status/${booking.id}`}>
                      <Button variant="outline">View Details</Button>
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
