'use client';

import { use } from 'react';
import { useAuth } from '@/lib/auth/context';
import type { Booking } from '@/lib/types/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, User, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useBooking } from '@/lib/hooks/use-booking';

export default function BookingStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data, isLoading, error } = useBooking(id);
  const booking = data?.booking;
  const technician = data?.technician;

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

  if (!user) {
    return <div className="container mx-auto p-4">Please sign in to view this booking.</div>;
  }

  if (isLoading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (error || !booking) {
    return <div className="container mx-auto p-4">Booking not found</div>;
  }

  // Verify ownership
  if (booking.clientId !== user.uid) {
    return <div className="container mx-auto p-4">Unauthorized access</div>;
  }

  const preferredDate = booking.preferredDateTime instanceof Date
    ? booking.preferredDateTime
    : typeof booking.preferredDateTime === 'string'
    ? new Date(booking.preferredDateTime)
    : booking.preferredDateTime?.toDate?.() || new Date();

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <Link href="/account/bookings" className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground">
        ← Back to Bookings
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Booking Details</CardTitle>
            <Badge className={getStatusColor(booking.status)}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {technician && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="font-medium">Technician</span>
              </div>
              <p className="text-lg font-semibold">{technician.name}</p>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Wrench className="h-4 w-4" />
              <span className="font-medium">Service Type</span>
            </div>
            <p>{booking.serviceType}</p>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">Problem Description</span>
            </div>
            <p className="whitespace-pre-wrap">{booking.problemDescription}</p>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">Address</span>
            </div>
            <p>{booking.address}</p>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Preferred Date & Time</span>
            </div>
            <p>{preferredDate.toLocaleString()}</p>
          </div>

          {booking.status === 'completed' && (
            <div className="pt-4">
              <Link href={`/account/reviews?bookingId=${booking.id}`}>
                <button className="text-primary underline">Leave a Review</button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
