"use client";

import { ReviewDialog } from "@/components/review-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth/context";
import { useBooking } from "@/lib/hooks/use-booking";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Booking } from "@/lib/types/database";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar, MapPin, MessageSquare, User, Wrench } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";

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

	// Realtime listener for booking status changes
	useEffect(() => {
		if (!id || !user || isLoading) return;

		const supabase = getSupabaseBrowserClient();

		const channel = supabase
			.channel(`booking-status:${id}`)
			.on("postgres_changes", { event: "UPDATE", schema: "public", table: "taas_bookings", filter: `id=eq.${id}` }, async (payload) => {
				const updatedBooking = payload.new as Booking;
				queryClient.invalidateQueries({ queryKey: ["booking", id] });

				if (updatedBooking.status === "completed" && updatedBooking.completed_by_client && updatedBooking.completed_by_technician && technician?.user_id) {
					const { data: existingReview } = await supabase.from("taas_reviews").select("id").eq("booking_id", id).eq("reviewer_id", user.id).eq("reviewee_id", technician.user_id).single();

					if (!existingReview) {
						setShowReviewDialog(true);
					} else {
						setHasReviewed(true);
					}
				}
			})
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [id, user?.id, technician, isLoading]);

	const getStatusColor = (status: string) => {
		switch (status) {
			case "requested":
				return "bg-yellow-100 text-yellow-800";
			case "accepted":
				return "bg-blue-100 text-blue-800";
			case "rejected":
				return "bg-red-100 text-red-800";
			case "confirmed":
				return "bg-green-100 text-green-800";
			case "completed":
				return "bg-gray-100 text-gray-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const handleMarkCompleted = async () => {
		if (!booking) return;
		setUpdating(true);
		try {
			const supabase = getSupabaseBrowserClient();
			const updates: Record<string, unknown> = {
				completed_by_client: true,
				updated_at: new Date().toISOString(),
			};
			if (booking.completed_by_technician) {
				updates.status = "completed";
			}
			await supabase.from("taas_bookings").update(updates).eq("id", id);
			queryClient.invalidateQueries({ queryKey: ["booking", id] });
			queryClient.invalidateQueries({ queryKey: ["bookings"] });
		} catch (error) {
			console.error("Error marking booking as completed:", error);
			toast.error("Failed to mark booking as completed. Please try again.");
		} finally {
			setUpdating(false);
		}
	};

	if (!user) return <div className="container mx-auto p-4">Please sign in to view this booking.</div>;
	if (isLoading) return <div className="container mx-auto p-4">Loading...</div>;
	if (error || !booking) return <div className="container mx-auto p-4">Booking not found</div>;
	if (booking.client_id !== user.id) return <div className="container mx-auto p-4">Unauthorized access</div>;

	const preferredDate = new Date(booking.preferred_date_time);

	return (
		<div className="container mx-auto max-w-2xl p-4">
			<Link href="/account/bookings" className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground">
				← Back to Bookings
			</Link>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>Booking Details</CardTitle>
						<Badge className={getStatusColor(booking.status)}>{booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</Badge>
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
						<p>{booking.service_type}</p>
					</div>
					<div>
						<div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
							<span className="font-medium">Problem Description</span>
						</div>
						<p className="whitespace-pre-wrap">{booking.problem_description}</p>
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
					{booking.negotiated_price && (
						<div>
							<div className="mb-2 text-sm text-muted-foreground">
								<span className="font-medium">Negotiated Price</span>
							</div>
							<p className="text-lg font-semibold">${booking.negotiated_price.toFixed(2)}</p>
						</div>
					)}
					{booking.negotiated_date_time && (
						<div>
							<div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
								<Calendar className="h-4 w-4" />
								<span className="font-medium">Negotiated Date & Time</span>
							</div>
							<p>{new Date(booking.negotiated_date_time).toLocaleString()}</p>
						</div>
					)}
					{(booking.status === "accepted" || booking.status === "confirmed") && (
						<div className="pt-4">
							<Link href={`/chat/${booking.id}`}>
								<Button className="w-full">
									<MessageSquare className="mr-2 h-4 w-4" />
									Open Chat
								</Button>
							</Link>
						</div>
					)}
					{booking.status === "confirmed" && booking.negotiated_price && booking.negotiated_date_time && !booking.completed_by_client && (
						<div className="pt-4">
							<Button onClick={() => setShowCompletionDialog(true)} disabled={updating} variant="outline" className="w-full">
								Mark Service as Completed
							</Button>
							{booking.completed_by_technician && <p className="mt-2 text-sm text-muted-foreground">Technician has confirmed that the work is completed. Once you confirm as well, the service will be finalized.</p>}
						</div>
					)}
					{(booking.status === "accepted" || (booking.status === "confirmed" && (!booking.negotiated_price || !booking.negotiated_date_time))) && !booking.completed_by_client && (
						<div className="pt-4">
							<Button disabled={true} variant="outline" className="w-full">
								Mark Service as Completed
							</Button>
							<p className="mt-2 text-sm text-muted-foreground">Please send an offer in the chat and wait for the technician to accept it before marking the service as completed.</p>
						</div>
					)}
					{booking.status === "completed" && (
						<div className="rounded-lg bg-green-50 p-4">
							<p className="font-semibold text-green-800">Service Completed</p>
							<p className="text-sm text-green-700">Both you and the technician have confirmed that the work has been completed.</p>
							{hasReviewed && <p className="mt-2 text-sm text-green-700">Thank you for your review!</p>}
						</div>
					)}
				</CardContent>
			</Card>

			{booking && technician && technician.user_id && (
				<ReviewDialog
					open={showReviewDialog}
					onOpenChange={setShowReviewDialog}
					booking={booking}
					reviewerId={user.id}
					revieweeId={technician.user_id}
					revieweeName={technician.name}
					revieweeType="technician"
					onReviewSubmitted={() => setHasReviewed(true)}
				/>
			)}

			<Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm Service Completion</DialogTitle>
						<DialogDescription>Please confirm that the service work has been fully completed.</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<p className="text-sm text-muted-foreground mb-4">Before confirming, please ensure:</p>
						<ul className="text-sm text-muted-foreground space-y-2 mb-4">
							<li>• All work has been completed as agreed</li>
							<li>• You are satisfied with the service provided</li>
							<li>• Any issues have been resolved</li>
						</ul>
						<p className="text-base font-bold text-red-600">⚠️ Only confirm if the service is really completed. This action cannot be easily undone.</p>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowCompletionDialog(false)} disabled={updating}>
							Cancel
						</Button>
						<Button
							onClick={async () => {
								setShowCompletionDialog(false);
								await handleMarkCompleted();
							}}
							disabled={updating}
						>
							{updating ? "Confirming..." : "Confirm Completion"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
