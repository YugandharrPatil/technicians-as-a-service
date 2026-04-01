'use client';

import { useEffect, useState } from 'react';
import { AdminGate } from '@/components/auth/admin-gate';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Booking, Technician, User } from '@/lib/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminBookingsPage() {
  return (<AdminGate><AdminBookingsContent /></AdminGate>);
}

type BookingWithDetails = Booking & { id: string; technician_name?: string; client_name?: string; };

function AdminBookingsContent() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');

  useEffect(() => { loadBookings(); }, [filter]);

  async function loadBookings() {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('taas_bookings')
        .select('*, taas_technicians(name), taas_users(display_name, email)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const bookingsData: BookingWithDetails[] = (data || [])
        .filter((b: any) => filter === 'all' || b.status === filter)
        .map((b: any) => ({
          ...b,
          technician_name: b.taas_technicians?.name,
          client_name: b.taas_users?.display_name || b.taas_users?.email,
        }));

      setBookings(bookingsData);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': case 'requested': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="container mx-auto p-4">Loading...</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">All Bookings</h1>
        <div className="flex gap-2">
          {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((status) => (
            <Button key={status} variant={filter === status ? 'default' : 'outline'} onClick={() => setFilter(status)}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {bookings.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No bookings found.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const preferredDate = new Date(booking.preferred_date_time);
            return (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{booking.service_type}</CardTitle>
                      <CardDescription>Client: {booking.client_name || 'Unknown'} | Technician: {booking.technician_name || 'Unknown'}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(booking.status)}>{booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><strong>Address:</strong> {booking.address}</p>
                    <p><strong>Preferred Date:</strong> {preferredDate.toLocaleString()}</p>
                    <p><strong>Description:</strong> {booking.problem_description}</p>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={booking.lead_contacted} readOnly /><span>Contacted</span>
                      <input type="checkbox" checked={booking.lead_closed} readOnly className="ml-4" /><span>Closed</span>
                    </div>
                  </div>
                  <div className="mt-4"><Link href={`/admin/bookings/${booking.id}`}><Button variant="outline">Manage Booking</Button></Link></div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
