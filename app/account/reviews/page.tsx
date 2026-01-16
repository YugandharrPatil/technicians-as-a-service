'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/lib/auth/context';
import { AuthGate } from '@/components/auth/auth-gate';
import type { Review, Booking, Technician } from '@/lib/types/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';

const reviewSchema = z.object({
  stars: z.number().min(1).max(5),
  text: z.string().optional(),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

export default function ReviewsPage() {
  return (
    <AuthGate>
      <ReviewsContent />
    </AuthGate>
  );
}

function ReviewsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const [booking, setBooking] = useState<(Booking & { id: string }) | null>(null);
  const [technician, setTechnician] = useState<(Technician & { id: string }) | null>(null);
  const [existingReview, setExistingReview] = useState<(Review & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      stars: 5,
      text: '',
    },
  });

  useEffect(() => {
    if (user && bookingId) {
      loadBookingAndReview();
    } else if (user) {
      loadUserReviews();
    }
  }, [user, bookingId]);

  async function loadBookingAndReview() {
    if (!user || !bookingId || !db) return;

    try {
      // Load booking
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingSnap = await getDoc(bookingRef);

      if (!bookingSnap.exists()) {
        setLoading(false);
        return;
      }

      const bookingData = { ...bookingSnap.data() as Booking, id: bookingSnap.id };
      
      if (bookingData.clientId !== user.uid || bookingData.status !== 'completed') {
        setLoading(false);
        return;
      }

      setBooking(bookingData);

      // Load technician
      const techRef = doc(db, 'technicians', bookingData.technicianId);
      const techSnap = await getDoc(techRef);
      if (techSnap.exists()) {
        setTechnician({ ...techSnap.data() as Technician, id: techSnap.id });
      }

      // Check for existing review
      const reviewQuery = query(
        collection(db, 'reviews'),
        where('bookingId', '==', bookingId)
      );
      const reviewSnap = await getDocs(reviewQuery);
      if (!reviewSnap.empty) {
        const reviewDoc = reviewSnap.docs[0];
        setExistingReview({ ...reviewDoc.data() as Review, id: reviewDoc.id });
        form.reset({
          stars: reviewDoc.data().stars,
          text: reviewDoc.data().text || '',
        });
      }
    } catch (error) {
      console.error('Error loading booking:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserReviews() {
    if (!user || !db) return;

    try {
      const q = query(
        collection(db, 'reviews'),
        where('clientId', '==', user.uid)
      );

      const snapshot = await getDocs(q);
      // For now, just show the form if no reviews
      // Could expand to show list of reviews
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(data: ReviewFormValues) {
    if (!user || !booking || !technician) return;

    setSubmitting(true);
    try {
      if (existingReview) {
        // Update existing review (would need update API)
        alert('Review already exists. Update functionality coming soon.');
      } else {
        if (!db) return;
        await addDoc(collection(db, 'reviews'), {
          bookingId: booking.id,
          clientId: user.uid,
          technicianId: technician.id,
          stars: data.stars,
          text: data.text || '',
          createdAt: new Date(),
        });

        alert('Review submitted successfully!');
        form.reset();
        setExistingReview(null);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (bookingId && (!booking || !technician)) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Booking not found or not eligible for review.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-3xl font-bold">Reviews</h1>

      {bookingId && booking && technician ? (
        <Card>
          <CardHeader>
            <CardTitle>Leave a Review</CardTitle>
            <CardDescription>
              Review your experience with {technician.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                              className="focus:outline-none"
                            >
                              <Star
                                className={`h-8 w-8 ${
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

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Select a completed booking to leave a review.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
