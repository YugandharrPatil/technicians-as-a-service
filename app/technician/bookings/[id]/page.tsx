'use client';

import { use } from 'react';
import { useEffect, useState } from 'react';
import { TechnicianGate } from '@/components/auth/technician-gate';
import { useAuth } from '@/lib/auth/context';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Booking, User } from '@/lib/types/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Calendar, MapPin, User as UserIcon, MessageSquare } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { ReviewDialog } from '@/components/review-dialog';
import { toast } from 'sonner';

export default function TechnicianBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <TechnicianGate>
      <TechnicianBookingDetailContent id={id} />
    </TechnicianGate>
  );
}

function TechnicianBookingDetailContent({ id }: { id: string }) {
  const { user } = useAuth();
  const [booking, setBooking] = useState<(Booking & { id: string }) | null>(null);
  const [client, setClient] = useState<(User & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const queryClient = useQueryClient();


  useEffect(() => {
    loadBooking();
  }, [id]);

  // Real-time listener to detect when booking becomes completed
  useEffect(() => {
    if (!db || !id || !user) return;

    const bookingRef = doc(db, 'bookings', id);
    const unsubscribe = onSnapshot(bookingRef, async (snapshot) => {
      if (!snapshot.exists()) return;

      const bookingData = { ...snapshot.data() as Booking, id: snapshot.id };
      
      // Update local state
      setBooking(bookingData);
      
      // If booking just became completed, check for review
      if (bookingData.status === 'completed' && bookingData.completedByClient && bookingData.completedByTechnician && db && client) {
        // Check if user has already reviewed
        try {
          const reviewQuery = query(
            collection(db, 'reviews'),
            where('bookingId', '==', id),
            where('reviewerId', '==', user.uid),
            where('revieweeId', '==', client.id)
          );
          const reviewSnap = await getDocs(reviewQuery);
          
          if (reviewSnap.empty) {
            // User hasn't reviewed yet, open dialog
            setShowReviewDialog(true);
          } else {
            setHasReviewed(true);
          }
        } catch (error) {
          console.error('Error checking review status:', error);
        }
      }
    });

    return () => unsubscribe();
  }, [id, user?.uid, client]);

  async function loadBooking() {
    if (!db) return;
    try {
      const bookingRef = doc(db, 'bookings', id);
      const bookingSnap = await getDoc(bookingRef);

      if (bookingSnap.exists()) {
        const bookingData = { ...bookingSnap.data() as Booking, id: bookingSnap.id };
        setBooking(bookingData);

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

  async function handleAccept() {
    if (!booking || !db) return;

    setUpdating(true);
    try {
      const bookingRef = doc(db, 'bookings', id);
      await updateDoc(bookingRef, {
        status: 'accepted',
        acceptedAt: new Date(),
        updatedAt: new Date(),
      });
      setBooking((prev) => prev ? { ...prev, status: 'accepted', acceptedAt: new Date() } : null);
      queryClient.invalidateQueries({ queryKey: ['technician-bookings'] });
    } catch (error) {
      console.error('Error accepting booking:', error);
      toast.error('Failed to accept booking. Please try again.');
    } finally {
      setUpdating(false);
    }
  }

  async function handleReject() {
    if (!booking || !db) return;

    setUpdating(true);
    try {
      const bookingRef = doc(db, 'bookings', id);
      await updateDoc(bookingRef, {
        status: 'rejected',
        updatedAt: new Date(),
      });
      setBooking((prev) => prev ? { ...prev, status: 'rejected' } : null);
      queryClient.invalidateQueries({ queryKey: ['technician-bookings'] });
    } catch (error) {
      console.error('Error rejecting booking:', error);
      toast.error('Failed to reject booking. Please try again.');
    } finally {
      setUpdating(false);
    }
  }

  async function handleMarkCompleted() {
    if (!booking || !db) return;

    setUpdating(true);
    try {
      const bookingRef = doc(db, 'bookings', id);
      const updates: Record<string, unknown> = {
        completedByTechnician: true,
        updatedAt: new Date(),
      };

      // If client also marked as completed, set status to completed
      if (booking.completedByClient) {
        updates.status = 'completed';
      }

      await updateDoc(bookingRef, updates);
      // Real-time listener will update the booking state and check for review
      queryClient.invalidateQueries({ queryKey: ['technician-bookings'] });
    } catch (error) {
      console.error('Error marking booking as completed:', error);
      toast.error('Failed to mark booking as completed. Please try again.');
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

  const negotiatedDate = booking.negotiatedDateTime 
    ? (booking.negotiatedDateTime instanceof Date
      ? booking.negotiatedDateTime
      : typeof booking.negotiatedDateTime === 'string'
      ? new Date(booking.negotiatedDateTime)
      : booking.negotiatedDateTime?.toDate?.() || null)
    : null;

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'requested':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <Link href="/technician/dashboard" className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground">
        ← Back to Dashboard
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
        <CardContent className="space-y-6">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <UserIcon className="h-4 w-4" />
              <span className="font-medium">Client</span>
            </div>
            <p className="text-lg font-semibold">{client?.displayName || client?.email || 'Unknown'}</p>
            {client?.email && <p className="text-sm text-muted-foreground">{client.email}</p>}
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
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

          {negotiatedDate && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Negotiated Date & Time</span>
              </div>
              <p>{negotiatedDate.toLocaleString()}</p>
            </div>
          )}

          {booking.negotiatedPrice && (
            <div>
              <div className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">Negotiated Price</span>
              </div>
              <p className="text-lg font-semibold">${booking.negotiatedPrice.toFixed(2)}</p>
            </div>
          )}

          {booking.status === 'requested' && (
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleAccept}
                disabled={updating}
                className="flex-1"
              >
                Accept Request
              </Button>
              <Button 
                onClick={handleReject}
                variant="destructive"
                disabled={updating}
                className="flex-1"
              >
                Reject Request
              </Button>
            </div>
          )}

          {(booking.status === 'accepted' || booking.status === 'confirmed') && (
            <div className="flex gap-2 pt-4">
              <Link href={`/chat/${booking.id}`} className="flex-1">
                <Button className="w-full">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Open Chat
                </Button>
              </Link>
            </div>
          )}

          {(booking.status === 'confirmed' || booking.status === 'accepted') && !booking.completedByTechnician && (
            <div className="pt-4">
              <Button 
                onClick={handleMarkCompleted}
                disabled={updating}
                variant="outline"
                className="w-full"
              >
                Mark as Completed
              </Button>
              {booking.completedByClient && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Client has marked this booking as completed. Once you mark it as completed, the booking will be finalized.
                </p>
              )}
            </div>
          )}

          {booking.status === 'completed' && (
            <div className="rounded-lg bg-green-50 p-4">
              <p className="font-semibold text-green-800">Booking Completed</p>
              <p className="text-sm text-green-700">
                Both you and the client have marked this booking as completed.
              </p>
              {hasReviewed && (
                <p className="mt-2 text-sm text-green-700">Thank you for your review!</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      {booking && client && (
        <ReviewDialog
          open={showReviewDialog}
          onOpenChange={(open) => {
            setShowReviewDialog(open);
            // Only mark as reviewed if dialog is closed after successful submission
            // The dialog will call onOpenChange(false) after successful submission
          }}
          booking={booking}
          reviewerId={user?.uid || ''}
          revieweeId={client.id}
          revieweeName={client.displayName || client.email || 'Client'}
          revieweeType="client"
          onReviewSubmitted={() => {
            setHasReviewed(true);
          }}
        />
      )}
    </div>
  );
}
