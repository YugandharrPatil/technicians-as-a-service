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
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Review, Booking, Technician, User } from '@/lib/types/database';

const reviewSchema = z.object({
  stars: z.number().min(1).max(5),
  text: z.string().optional(),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

type ReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking;
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
  const [existingReview, setExistingReview] = useState<Review | null>(null);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      stars: 5,
      text: '',
    },
  });

  useEffect(() => {
    if (open) {
      checkExistingReview();
    }
  }, [open, booking.id, reviewerId, revieweeId]);

  async function checkExistingReview() {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('taas_reviews')
        .select('*')
        .eq('booking_id', booking.id)
        .eq('reviewer_id', reviewerId)
        .eq('reviewee_id', revieweeId)
        .single();

      if (data) {
        setExistingReview(data as Review);
        form.reset({
          stars: data.stars,
          text: data.text || '',
        });
      } else {
        setExistingReview(null);
        form.reset({ stars: 5, text: '' });
      }
    } catch {
      setExistingReview(null);
      form.reset({ stars: 5, text: '' });
    }
  }

  async function updateRatings(revieweeId: string, revieweeType: 'client' | 'technician', newRating: number, oldRating?: number) {
    try {
      const supabase = getSupabaseBrowserClient();

      // Get all reviews for this reviewee
      const { data: allReviews } = await supabase
        .from('taas_reviews')
        .select('stars')
        .eq('reviewee_id', revieweeId);

      let totalStars = 0;
      let reviewCount = (allReviews || []).length;

      (allReviews || []).forEach((r: any) => {
        totalStars += r.stars;
      });

      if (oldRating !== undefined) {
        totalStars = totalStars - oldRating + newRating;
      } else {
        totalStars += newRating;
        reviewCount++;
      }

      const ratingAvg = reviewCount > 0 ? totalStars / reviewCount : 0;
      const roundedAvg = Math.round(ratingAvg * 10) / 10;

      if (revieweeType === 'technician') {
        const { data: tech } = await supabase
          .from('taas_technicians')
          .select('id')
          .eq('user_id', revieweeId)
          .single();

        if (tech) {
          await supabase
            .from('taas_technicians')
            .update({ rating_avg: roundedAvg, rating_count: reviewCount })
            .eq('id', tech.id);
        }
      } else {
        await supabase
          .from('taas_users')
          .update({ rating_avg: roundedAvg, rating_count: reviewCount })
          .eq('id', revieweeId);
      }
    } catch (error) {
      console.error('Error updating ratings:', error);
    }
  }

  async function onSubmit(data: ReviewFormValues) {
    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();

      if (existingReview) {
        const oldRating = existingReview.stars;
        await supabase
          .from('taas_reviews')
          .update({ stars: data.stars, text: data.text || '' })
          .eq('id', existingReview.id);

        await updateRatings(revieweeId, revieweeType, data.stars, oldRating);
        toast.success('Review updated successfully!');
      } else {
        await supabase.from('taas_reviews').insert({
          booking_id: booking.id,
          client_id: booking.client_id,
          technician_id: booking.technician_id,
          reviewer_id: reviewerId,
          reviewee_id: revieweeId,
          stars: data.stars,
          text: data.text || '',
        });

        await updateRatings(revieweeId, revieweeType, data.stars);
        toast.success('Review submitted successfully!');
      }

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
