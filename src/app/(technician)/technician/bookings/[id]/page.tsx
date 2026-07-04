"use client";

import { TechnicianGate } from "@/components/auth/technician-gate";
import { ReviewDialog } from "@/components/review-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth/context";
import { getBookingAction, getUserAction, updateBookingAction, checkExistingReviewAction } from "@/actions/client-db";
import type { Booking, User } from "@/lib/types/database";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar, MapPin, MessageSquare, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";

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
	const [showCompletionDialog, setShowCompletionDialog] = useState(false);
	const queryClient = useQueryClient();

	useEffect(() => {
		loadBooking();
	}, [id]);

	// Periodic polling to check for status updates
	useEffect(() => {
		if (!id || !user) return;
		const userId = user.id;

		let active = true;

		async function pollBooking() {
			try {
				const res = await getBookingAction(id);
				if (!res || !active) return;
				
				const updated = res.booking;
				setBooking({ ...updated, id: updated.id });

				if (updated.status === "completed" && updated.completed_by_client && updated.completed_by_technician && client) {
					const review = await checkExistingReviewAction(id, userId, client.id);
					if (!review) {
						setShowReviewDialog(true);
					} else {
						setHasReviewed(true);
					}
				}
			} catch (error) {
				console.error("Error polling booking status:", error);
			}
		}

		const interval = setInterval(pollBooking, 2000);
		return () => {
			active = false;
			clearInterval(interval);
		};
	}, [id, user?.id, client]);

	async function loadBooking() {
		try {
			const res = await getBookingAction(id);
			if (res && res.booking) {
				setBooking(res.booking as Booking & { id: string });
				const userData = await getUserAction(res.booking.client_id);
				if (userData) setClient(userData as User & { id: string });
			}
		} catch (error) {
			console.error("Error loading booking:", error);
		} finally {
			setLoading(false);
		}
	}

	async function handleAccept() {
		if (!booking) return;
		setUpdating(true);
		try {
			const acceptedAt = new Date().toISOString();
			await updateBookingAction(id, {
				status: "accepted",
				accepted_at: acceptedAt,
			});
			setBooking((prev) => (prev ? { ...prev, status: "accepted", accepted_at: acceptedAt } : null));
			queryClient.invalidateQueries({ queryKey: ["technician-bookings"] });
		} catch (error) {
			console.error("Error accepting booking:", error);
			toast.error("Failed to accept booking. Please try again.");
		} finally {
			setUpdating(false);
		}
	}

	async function handleReject() {
		if (!booking) return;
		setUpdating(true);
		try {
			await updateBookingAction(id, { status: "rejected" });
			setBooking((prev) => (prev ? { ...prev, status: "rejected" } : null));
			queryClient.invalidateQueries({ queryKey: ["technician-bookings"] });
		} catch (error) {
			console.error("Error rejecting booking:", error);
			toast.error("Failed to reject booking. Please try again.");
		} finally {
			setUpdating(false);
		}
	}

	async function handleMarkCompleted() {
		if (!booking) return;
		setUpdating(true);
		try {
			const updates: Partial<Booking> = {
				completed_by_technician: true,
			};
			if (booking.completed_by_client) updates.status = "completed";
			await updateBookingAction(id, updates);
			queryClient.invalidateQueries({ queryKey: ["technician-bookings"] });
		} catch (error) {
			console.error("Error marking booking as completed:", error);
			toast.error("Failed to mark booking as completed. Please try again.");
		} finally {
			setUpdating(false);
		}
	}

	if (loading) return <div className="container mx-auto p-4">Loading...</div>;
	if (!booking) return <div className="container mx-auto p-4">Booking not found</div>;

	const preferredDate = new Date(booking.preferred_date_time);
	const negotiatedDate = booking.negotiated_date_time ? new Date(booking.negotiated_date_time) : null;

	const getStatusColor = (status: Booking["status"]) => {
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

	return (
		<div className="container mx-auto max-w-4xl p-4">
			<Link href="/technician/dashboard" className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground">
				← Back to Dashboard
			</Link>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>Booking Details</CardTitle>
						<Badge className={getStatusColor(booking.status)}>{booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</Badge>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					<div>
						<div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
							<UserIcon className="h-4 w-4" />
							<span className="font-medium">Client</span>
						</div>
						<p className="text-lg font-semibold">{client?.display_name || client?.email || "Unknown"}</p>
						{client?.email && <p className="text-sm text-muted-foreground">{client.email}</p>}
					</div>
					<div>
						<div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
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
					{negotiatedDate && (
						<div>
							<div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
								<Calendar className="h-4 w-4" />
								<span className="font-medium">Negotiated Date & Time</span>
							</div>
							<p>{negotiatedDate.toLocaleString()}</p>
						</div>
					)}
					{booking.negotiated_price && (
						<div>
							<div className="mb-2 text-sm text-muted-foreground">
								<span className="font-medium">Negotiated Price</span>
							</div>
							<p className="text-lg font-semibold">${Number(booking.negotiated_price).toFixed(2)}</p>
						</div>
					)}
					{booking.status === "requested" && (
						<div className="flex gap-2 pt-4">
							<Button onClick={handleAccept} disabled={updating} className="flex-1">
								Accept Request
							</Button>
							<Button onClick={handleReject} variant="destructive" disabled={updating} className="flex-1">
								Reject Request
							</Button>
						</div>
					)}
					{(booking.status === "accepted" || booking.status === "confirmed") && (
						<div className="flex gap-2 pt-4">
							<Link href={`/chat/${booking.id}`} className="flex-1">
								<Button className="w-full">
									<MessageSquare className="mr-2 h-4 w-4" />
									Open Chat
								</Button>
							</Link>
						</div>
					)}
					{booking.status === "confirmed" && booking.negotiated_price && booking.negotiated_date_time && !booking.completed_by_technician && (
						<div className="pt-4">
							<Button onClick={() => setShowCompletionDialog(true)} disabled={updating} variant="outline" className="w-full">
								Mark Service as Completed
							</Button>
							{booking.completed_by_client && <p className="mt-2 text-sm text-muted-foreground">Client has confirmed that the work is completed. Once you confirm as well, the service will be finalized.</p>}
						</div>
					)}
					{(booking.status === "accepted" || (booking.status === "confirmed" && (!booking.negotiated_price || !booking.negotiated_date_time))) && !booking.completed_by_technician && (
						<div className="pt-4">
							<Button disabled={true} variant="outline" className="w-full">
								Mark Service as Completed
							</Button>
							<p className="mt-2 text-sm text-muted-foreground">Please wait for the client to send an offer and accept it before marking the service as completed.</p>
						</div>
					)}
					{booking.status === "completed" && (
						<div className="rounded-lg bg-green-50 p-4">
							<p className="font-semibold text-green-800">Service Completed</p>
							<p className="text-sm text-green-700">Both you and the client have confirmed that the work has been completed.</p>
							{hasReviewed && <p className="mt-2 text-sm text-green-700">Thank you for your review!</p>}
						</div>
					)}
				</CardContent>
			</Card>

			{booking && client && (
				<ReviewDialog
					open={showReviewDialog}
					onOpenChange={setShowReviewDialog}
					booking={booking}
					reviewerId={user?.id || ""}
					revieweeId={client.id}
					revieweeName={client.display_name || client.email || "Client"}
					revieweeType="client"
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
