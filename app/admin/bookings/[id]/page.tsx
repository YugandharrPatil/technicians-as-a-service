'use client';

import { use } from 'react';
import { useEffect, useState } from 'react';
import { AdminGate } from '@/components/auth/admin-gate';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Booking, Technician, User } from '@/lib/types/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { Calendar, MapPin, User as UserIcon, Wrench } from 'lucide-react';

export default function AdminBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AdminGate>
      <AdminBookingDetailContent id={id} />
    </AdminGate>
  );
}

function AdminBookingDetailContent({ id }: { id: string }) {
  const [booking, setBooking] = useState<(Booking & { id: string }) | null>(null);
  const [technician, setTechnician] = useState<(Technician & { id: string }) | null>(null);
  const [client, setClient] = useState<(User & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadBooking();
  }, [id]);

  async function loadBooking() {
    if (!db) return;
    try {
      const bookingRef = doc(db, 'bookings', id);
      const bookingSnap = await getDoc(bookingRef);

      if (bookingSnap.exists()) {
        const bookingData = { ...bookingSnap.data() as Booking, id: bookingSnap.id };
        setBooking(bookingData);

        // Load technician
        const techRef = doc(db, 'technicians', bookingData.technicianId);
        const techSnap = await getDoc(techRef);
        if (techSnap.exists()) {
          setTechnician({ ...techSnap.data() as Technician, id: techSnap.id });
        }

        // Load client
        const userRef = doc(db, 'users', bookingData.clientId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setClient({ ...userSnap.data() as User, id: userSnap.id });
        }
      }
    } catch (error) {
      console.error('Error loading booking:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus: string) {
    if (!booking) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setBooking((prev) => prev ? { ...prev, status: newStatus as Booking['status'] } : null);
      } else {
        alert('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  }

  async function updateLead(field: 'contacted' | 'closed', value: boolean) {
    if (!booking) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead: { ...booking.lead, [field]: value } }),
      });

      if (response.ok) {
        setBooking((prev) => prev ? {
          ...prev,
          lead: { ...prev.lead, [field]: value }
        } : null);
      } else {
        alert('Failed to update lead status');
      }
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Failed to update lead status');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (!booking) {
    return <div className="container mx-auto p-4">Booking not found</div>;
  }

  const preferredDate = booking.preferredDateTime instanceof Date
    ? booking.preferredDateTime
    : typeof booking.preferredDateTime === 'string'
    ? new Date(booking.preferredDateTime)
    : booking.preferredDateTime?.toDate?.() || new Date();

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <Link href="/admin/bookings" className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground">
        ← Back to Bookings
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Booking Management</CardTitle>
            <Badge>{booking.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="mb-4 font-semibold">Update Status</h3>
            <Select
              value={booking.status}
              onValueChange={updateStatus}
              disabled={updating}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">Lead Tracking</h3>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="contacted"
                  checked={booking.lead.contacted}
                  onCheckedChange={(checked) => updateLead('contacted', checked === true)}
                  disabled={updating}
                />
                <label htmlFor="contacted" className="cursor-pointer">Contacted</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="closed"
                  checked={booking.lead.closed}
                  onCheckedChange={(checked) => updateLead('closed', checked === true)}
                  disabled={updating}
                />
                <label htmlFor="closed" className="cursor-pointer">Closed</label>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <UserIcon className="h-4 w-4" />
                <span className="font-medium">Client</span>
              </div>
              <p className="text-lg font-semibold">{client?.displayName || client?.email || 'Unknown'}</p>
              <Link href={`/admin/clients/${booking.clientId}`} className="text-sm text-primary underline">
                View Client Profile
              </Link>
            </div>

            {technician && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Wrench className="h-4 w-4" />
                  <span className="font-medium">Technician</span>
                </div>
                <p className="text-lg font-semibold">{technician.name}</p>
                <Link href={`/admin/technicians/${technician.id}`} className="text-sm text-primary underline">
                  View Technician Profile
                </Link>
              </div>
            )}
          </div>

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
        </CardContent>
      </Card>
    </div>
  );
}
