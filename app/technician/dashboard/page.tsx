'use client';

import { TechnicianGate } from '@/components/auth/technician-gate';
import { useAuth } from '@/lib/auth/context';
import { useTechnicianBookings } from '@/lib/hooks/use-technician-bookings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState } from 'react';
import type { BookingStatus } from '@/lib/types/database';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar, MapPin, User } from 'lucide-react';

export default function TechnicianDashboardPage() {
  return (
    <TechnicianGate>
      <TechnicianDashboardContent />
    </TechnicianGate>
  );
}

function TechnicianDashboardContent() {
  const { user } = useAuth();
  const { data: bookings, isLoading } = useTechnicianBookings(user?.id);
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all');
  const queryClient = useQueryClient();

  const filteredBookings = bookings?.filter((booking) => 
    filter === 'all' || booking.status === filter
  ) || [];

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'requested': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAccept = async (bookingId: string) => {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.from('taas_bookings').update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', bookingId);
      queryClient.invalidateQueries({ queryKey: ['technician-bookings'] });
    } catch (error) {
      console.error('Error accepting booking:', error);
      alert('Failed to accept booking. Please try again.');
    }
  };

  const handleReject = async (bookingId: string) => {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.from('taas_bookings').update({
        status: 'rejected',
        updated_at: new Date().toISOString(),
      }).eq('id', bookingId);
      queryClient.invalidateQueries({ queryKey: ['technician-bookings'] });
    } catch (error) {
      console.error('Error rejecting booking:', error);
      alert('Failed to reject booking. Please try again.');
    }
  };

  if (isLoading) {
    return (<div className="container mx-auto p-4"><div className="text-center">Loading...</div></div>);
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <div className="flex gap-2">
          {(['all', 'requested', 'accepted', 'confirmed', 'completed', 'rejected'] as const).map((status) => (
            <Button key={status} variant={filter === status ? 'default' : 'outline'} onClick={() => setFilter(status)} size="sm">
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No bookings found.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking: any) => {
            const preferredDate = new Date(booking.preferred_date_time);
            return (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{booking.service_type}</CardTitle>
                      <CardDescription>
                        <div className="flex items-center gap-2 mt-1">
                          <User className="h-4 w-4" />
                          <span>{booking.client_name || booking.client_email || 'Unknown Client'}</span>
                        </div>
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(booking.status)}>{booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{booking.address}</span></div>
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span>{preferredDate.toLocaleString()}</span></div>
                    <p className="mt-2"><strong>Description:</strong> {booking.problem_description}</p>
                    {booking.negotiated_price && <p><strong>Negotiated Price:</strong> ${booking.negotiated_price.toFixed(2)}</p>}
                  </div>
                  <div className="mt-4 flex gap-2">
                    {booking.status === 'requested' && (
                      <>
                        <Button onClick={() => handleAccept(booking.id)} className="flex-1">Accept</Button>
                        <Button onClick={() => handleReject(booking.id)} variant="destructive" className="flex-1">Reject</Button>
                      </>
                    )}
                    {(booking.status === 'accepted' || booking.status === 'confirmed') && (
                      <Link href={`/chat/${booking.id}`} className="flex-1"><Button className="w-full">Open Chat</Button></Link>
                    )}
                    <Link href={`/technician/bookings/${booking.id}`}><Button variant="outline">View Details</Button></Link>
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
