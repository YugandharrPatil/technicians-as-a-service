'use client';

import { use, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import type { Booking } from '@/lib/types/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, User, Wrench, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useBooking } from '@/lib/hooks/use-booking';
import { doc, updateDoc, collection, query, where, getDocs, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useQueryClient } from '@tanstack/react-query';
import { ReviewDialog } from '@/components/review-dialog';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function BookingStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data, isLoading, error } = useBooking(id);
  const booking = data?.booking;
  const technician = data?.technician;

  const [updating, setUpdating] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const queryClient = useQueryClient();

  // Real-time listener to detect when booking becomes completed
  useEffect(() => {
    if (!db || !id || !user || isLoading) return;

    const bookingRef = doc(db, 'bookings', id);
    const unsubscribe = onSnapshot(bookingRef, async (snapshot) => {
      if (!snapshot.exists()) return;

      const bookingData = { ...snapshot.data() as Booking, id: snapshot.id };
      
      // If booking just became completed, check for review
      if (bookingData.status === 'completed' && bookingData.completedByClient && bookingData.completedByTechnician && db) {
        // Wait for technician data to be loaded
        let techUserId = technician?.userId;
        if (!techUserId) {
          // Reload technician if not available
          const techRef = doc(db, 'technicians', bookingData.technicianId);
          const techSnap = await getDoc(techRef);
          if (!techSnap.exists()) return;
          const techData = techSnap.data();
          if (!techData?.userId) return;
          techUserId = techData.userId;
        }
        
        if (!techUserId) return;
        
        // Check if user has already reviewed
        try {
          const reviewQuery = query(
            collection(db, 'reviews'),
            where('bookingId', '==', id),
            where('reviewerId', '==', user.uid),
            where('revieweeId', '==', techUserId)
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
  }, [id, user?.uid, technician, isLoading]);

  const getStatusColor = (status: string) => {
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

  const handleMarkCompleted = async () => {
    if (!booking || !db) return;

    setUpdating(true);
    try {
      const bookingRef = doc(db, 'bookings', id);
      const updates: Record<string, unknown> = {
        completedByClient: true,
        updatedAt: new Date(),
      };

      // If technician also marked as completed, set status to completed
      if (booking.completedByTechnician) {
        updates.status = 'completed';
      }

      await updateDoc(bookingRef, updates);
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    } catch (error) {
      console.error('Error marking booking as completed:', error);
      toast.error('Failed to mark booking as completed. Please try again.');
    } finally {
      setUpdating(false);
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

          {booking.negotiatedPrice && (
            <div>
              <div className="mb-2 text-sm text-muted-foreground">
                <span className="font-medium">Negotiated Price</span>
              </div>
              <p className="text-lg font-semibold">${booking.negotiatedPrice.toFixed(2)}</p>
            </div>
          )}

          {booking.negotiatedDateTime && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Negotiated Date & Time</span>
              </div>
              <p>
                {booking.negotiatedDateTime instanceof Date
                  ? booking.negotiatedDateTime.toLocaleString()
                  : typeof booking.negotiatedDateTime === 'string'
                  ? new Date(booking.negotiatedDateTime).toLocaleString()
                  : booking.negotiatedDateTime?.toDate?.()?.toLocaleString() || 'N/A'}
              </p>
            </div>
          )}

          {(booking.status === 'accepted' || booking.status === 'confirmed') && (
            <div className="pt-4">
              <Link href={`/chat/${booking.id}`}>
                <Button className="w-full">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Open Chat
                </Button>
              </Link>
            </div>
          )}

          {booking.status === 'confirmed' && booking.negotiatedPrice && booking.negotiatedDateTime && !booking.completedByClient && (
            <div className="pt-4">
              <Button 
                onClick={() => setShowCompletionDialog(true)}
                disabled={updating}
                variant="outline"
                className="w-full"
              >
                Mark Service as Completed
              </Button>
              {booking.completedByTechnician && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Technician has confirmed that the work is completed. Once you confirm as well, the service will be finalized.
                </p>
              )}
            </div>
          )}
          {(booking.status === 'accepted' || (booking.status === 'confirmed' && (!booking.negotiatedPrice || !booking.negotiatedDateTime))) && !booking.completedByClient && (
            <div className="pt-4">
              <Button 
                disabled={true}
                variant="outline"
                className="w-full"
              >
                Mark Service as Completed
              </Button>
              <p className="mt-2 text-sm text-muted-foreground">
                Please send an offer in the chat and wait for the technician to accept it before marking the service as completed.
              </p>
            </div>
          )}

          {booking.status === 'completed' && (
            <div className="rounded-lg bg-green-50 p-4">
              <p className="font-semibold text-green-800">Service Completed</p>
              <p className="text-sm text-green-700">
                Both you and the technician have confirmed that the work has been completed.
              </p>
              {hasReviewed && (
                <p className="mt-2 text-sm text-green-700">Thank you for your review!</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      {booking && technician && technician.userId && (
        <ReviewDialog
          open={showReviewDialog}
          onOpenChange={(open) => {
            setShowReviewDialog(open);
            // Only mark as reviewed if dialog is closed after successful submission
            // The dialog will call onOpenChange(false) after successful submission
          }}
          booking={booking}
          reviewerId={user.uid}
          revieweeId={technician.userId}
          revieweeName={technician.name}
          revieweeType="technician"
          onReviewSubmitted={() => {
            setHasReviewed(true);
          }}
        />
      )}

      {/* Completion Confirmation Dialog */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Service Completion</DialogTitle>
            <DialogDescription>
              Please confirm that the service work has been fully completed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Before confirming, please ensure:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 mb-4">
              <li>• All work has been completed as agreed</li>
              <li>• You are satisfied with the service provided</li>
              <li>• Any issues have been resolved</li>
            </ul>
            <p className="text-base font-bold text-red-600">
              ⚠️ Only confirm if the service is really completed. This action cannot be easily undone.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCompletionDialog(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setShowCompletionDialog(false);
                await handleMarkCompleted();
              }}
              disabled={updating}
            >
              {updating ? 'Confirming...' : 'Confirm Completion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
