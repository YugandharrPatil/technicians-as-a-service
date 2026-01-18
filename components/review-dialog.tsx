'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import { collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Review, Booking, Technician, User } from '@/lib/types/firestore';

const reviewSchema = z.object({
  stars: z.number().min(1).max(5),
  text: z.string().optional(),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

type ReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking & { id: string };
  reviewerId: string;
  revieweeId: string;
  revieweeName: string;
  revieweeType: 'client' | 'technician';
  onReviewSubmitted?: () => void;
};

export function ReviewDialog({
  open,
  onOpenChange,
  booking,
  reviewerId,
  revieweeId,
  revieweeName,
  revieweeType,
  onReviewSubmitted,
}: ReviewDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState<(Review & { id: string }) | null>(null);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      stars: 5,
      text: '',
    },
  });

  // Check for existing review when dialog opens
  useEffect(() => {
    if (open && db) {
      checkExistingReview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, booking.id, reviewerId, revieweeId]);

  async function checkExistingReview() {
    if (!db) return;

    try {
      const reviewQuery = query(
        collection(db, 'reviews'),
        where('bookingId', '==', booking.id),
        where('reviewerId', '==', reviewerId),
        where('revieweeId', '==', revieweeId)
      );
      const reviewSnap = await getDocs(reviewQuery);
      
      if (!reviewSnap.empty) {
        const reviewDoc = reviewSnap.docs[0];
        const reviewData = { ...reviewDoc.data() as Review, id: reviewDoc.id };
        setExistingReview(reviewData);
        form.reset({
          stars: reviewData.stars,
          text: reviewData.text || '',
        });
      } else {
        setExistingReview(null);
        form.reset({
          stars: 5,
          text: '',
        });
      }
    } catch (error) {
      console.error('Error checking existing review:', error);
    }
  }

  async function updateRatings(revieweeId: string, revieweeType: 'client' | 'technician', newRating: number, oldRating?: number) {
    if (!db) return;

    try {
      if (revieweeType === 'technician') {
        // Update technician rating - revieweeId is the technician's userId
        const techniciansQuery = query(
          collection(db, 'technicians'),
          where('userId', '==', revieweeId)
        );
        const techniciansSnapshot = await getDocs(techniciansQuery);
        
        if (!techniciansSnapshot.empty) {
          const technicianDoc = techniciansSnapshot.docs[0];
          const technicianRef = doc(db, 'technicians', technicianDoc.id);
          
          // Get all reviews for this technician (by userId)
          const allReviewsQuery = query(
            collection(db, 'reviews'),
            where('revieweeId', '==', revieweeId)
          );
          const allReviewsSnap = await getDocs(allReviewsQuery);
          
          let totalStars = 0;
          let reviewCount = allReviewsSnap.size;
          
          allReviewsSnap.forEach((reviewDoc) => {
            const reviewData = reviewDoc.data() as Review;
            totalStars += reviewData.stars;
          });
          
          // Adjust for update: subtract old rating if updating, then add new rating
          if (oldRating !== undefined) {
            totalStars = totalStars - oldRating + newRating;
          } else {
            // New review: add the new rating
            totalStars += newRating;
            reviewCount++;
          }
          
          const ratingAvg = reviewCount > 0 ? totalStars / reviewCount : 0;
          
          await updateDoc(technicianRef, {
            ratingAvg: Math.round(ratingAvg * 10) / 10, // Round to 1 decimal
            ratingCount: reviewCount,
          });
        }
      } else {
        // Update user rating (for clients) - revieweeId is the clientId
        const userRef = doc(db, 'users', revieweeId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          // Get all reviews for this user
          const allReviewsQuery = query(
            collection(db, 'reviews'),
            where('revieweeId', '==', revieweeId)
          );
          const allReviewsSnap = await getDocs(allReviewsQuery);
          
          let totalStars = 0;
          let reviewCount = allReviewsSnap.size;
          
          allReviewsSnap.forEach((reviewDoc) => {
            const reviewData = reviewDoc.data() as Review;
            totalStars += reviewData.stars;
          });
          
          // Adjust for update: subtract old rating if updating, then add new rating
          if (oldRating !== undefined) {
            totalStars = totalStars - oldRating + newRating;
          } else {
            // New review: add the new rating
            totalStars += newRating;
            reviewCount++;
          }
          
          const ratingAvg = reviewCount > 0 ? totalStars / reviewCount : 0;
          
          await updateDoc(userRef, {
            ratingAvg: Math.round(ratingAvg * 10) / 10, // Round to 1 decimal
            ratingCount: reviewCount,
          });
        }
      }
    } catch (error) {
      console.error('Error updating ratings:', error);
      // Don't throw - rating update failure shouldn't block review submission
    }
  }

  async function onSubmit(data: ReviewFormValues) {
    if (!db) return;

    setSubmitting(true);
    try {
      const reviewData: Omit<Review, 'createdAt'> & { createdAt: Date } = {
        bookingId: booking.id,
        clientId: booking.clientId,
        technicianId: booking.technicianId,
        reviewerId,
        revieweeId,
        stars: data.stars,
        text: data.text || '',
        createdAt: new Date(),
      };

      if (existingReview) {
        // Update existing review
        const reviewRef = doc(db, 'reviews', existingReview.id);
        const oldRating = existingReview.stars;
        
        await updateDoc(reviewRef, {
          stars: data.stars,
          text: data.text || '',
        });

        // Update ratings with old rating for proper recalculation
        await updateRatings(revieweeId, revieweeType, data.stars, oldRating);

        toast.success('Review updated successfully!');
        setExistingReview({ ...reviewData, id: existingReview.id } as Review & { id: string });
      } else {
        // Create new review document
        const newReviewRef = await addDoc(collection(db, 'reviews'), reviewData);

        // Update ratings (new review)
        await updateRatings(revieweeId, revieweeType, data.stars);

        toast.success('Review submitted successfully!');
        setExistingReview({ ...reviewData, id: newReviewRef.id } as Review & { id: string });
      }

      // Notify parent that review was submitted
      onReviewSubmitted?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Rate Your Experience</DialogTitle>
          <DialogDescription>
            How was your experience with {revieweeName}?
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="stars"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => field.onChange(star)}
                          className="focus:outline-none transition-transform hover:scale-110"
                        >
                          <Star
                            className={`h-10 w-10 ${
                              star <= field.value
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Review (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Share your experience..."
                      rows={5}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Skip
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
