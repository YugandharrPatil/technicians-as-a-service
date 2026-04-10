"use client";

import { AuthGate } from "@/components/auth/auth-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Booking, Review, Technician, User } from "@/lib/types/database";
import { zodResolver } from "@hookform/resolvers/zod";
import { Star } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

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
	const bookingId = searchParams.get("bookingId");
	const [booking, setBooking] = useState<(Booking & { id: string }) | null>(null);
	const [technician, setTechnician] = useState<(Technician & { id: string }) | null>(null);
	const [client, setClient] = useState<(User & { id: string }) | null>(null);
	const [existingReview, setExistingReview] = useState<(Review & { id: string }) | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [isClientReview, setIsClientReview] = useState(true);

	const form = useForm<ReviewFormValues>({
		resolver: zodResolver(reviewSchema),
		defaultValues: { stars: 5, text: "" },
	});

	useEffect(() => {
		if (user && bookingId) loadBookingAndReview();
		else if (user) setLoading(false);
	}, [user, bookingId]);

	async function loadBookingAndReview() {
		if (!user || !bookingId) return;
		try {
			const supabase = getSupabaseBrowserClient();
			const { data: bookingData } = await supabase.from("taas_bookings").select("*").eq("id", bookingId).single();
			if (!bookingData || bookingData.status !== "completed") {
				setLoading(false);
				return;
			}

			const bk = bookingData as Booking & { id: string };
			const isClientUser = bk.client_id === user.id;

			// Check if user is a technician for this booking
			const { data: techByUser } = await supabase.from("taas_technicians").select("id").eq("user_id", user.id).single();
			const isTechnicianUser = !!techByUser;

			if (!isClientUser && !isTechnicianUser) {
				setLoading(false);
				return;
			}

			setBooking(bk);
			setIsClientReview(isClientUser);

			if (isClientUser) {
				const { data: techData } = await supabase.from("taas_technicians").select("*").eq("id", bk.technician_id).single();
				if (techData) setTechnician(techData as Technician & { id: string });
			} else {
				const { data: clientData } = await supabase.from("taas_users").select("*").eq("id", bk.client_id).single();
				if (clientData) setClient(clientData as User & { id: string });
			}

			const { data: reviewData } = await supabase.from("taas_reviews").select("*").eq("booking_id", bookingId).eq("reviewer_id", user.id).single();
			if (reviewData) {
				setExistingReview(reviewData as Review & { id: string });
				form.reset({ stars: reviewData.stars, text: reviewData.text || "" });
			}
		} catch (error) {
			console.error("Error loading booking:", error);
		} finally {
			setLoading(false);
		}
	}

	async function onSubmit(data: ReviewFormValues) {
		if (!user || !booking) return;
		setSubmitting(true);
		try {
			const supabase = getSupabaseBrowserClient();
			const isClient = booking.client_id === user.id;

			if (existingReview) {
				alert("Review already exists. Update functionality coming soon.");
				setSubmitting(false);
				return;
			}

			const revieweeId = isClient ? technician?.user_id || technician?.id || "" : booking.client_id;

			await supabase.from("taas_reviews").insert({
				booking_id: booking.id,
				client_id: booking.client_id,
				technician_id: booking.technician_id,
				reviewer_id: user.id,
				reviewee_id: revieweeId,
				stars: data.stars,
				text: data.text || "",
			});

			alert("Review submitted successfully!");
			form.reset();
			setExistingReview(null);
		} catch (error) {
			console.error("Error submitting review:", error);
			alert("Failed to submit review. Please try again.");
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) return <div className="container mx-auto p-4">Loading...</div>;

	if (bookingId && (!booking || (!technician && !client))) {
		return (
			<div className="container mx-auto p-4">
				<Card>
					<CardContent className="py-8 text-center text-muted-foreground">Booking not found or not eligible for review.</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-2xl p-4">
			<h1 className="mb-6 text-3xl font-bold">Reviews</h1>
			{bookingId && booking && (technician || client) ? (
				<Card>
					<CardHeader>
						<CardTitle>Leave a Review</CardTitle>
						<CardDescription>{isClientReview && technician ? `Review your experience with ${technician.name}` : client ? `Review your experience with ${client.display_name || client.email}` : "Leave a review"}</CardDescription>
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
														<button key={star} type="button" onClick={() => field.onChange(star)} className="focus:outline-none">
															<Star className={`h-8 w-8 ${star <= field.value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
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
												<Textarea {...field} placeholder="Share your experience..." rows={5} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<Button type="submit" className="w-full" disabled={submitting}>
									{submitting ? "Submitting..." : existingReview ? "Update Review" : "Submit Review"}
								</Button>
							</form>
						</Form>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardContent className="py-8 text-center text-muted-foreground">Select a completed booking to leave a review.</CardContent>
				</Card>
			)}
		</div>
	);
}
