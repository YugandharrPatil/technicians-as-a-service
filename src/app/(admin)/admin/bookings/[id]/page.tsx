"use client";

import { updateBookingLead, updateBookingStatus } from "@/actions/admin";
import { AdminGate } from "@/components/auth/admin-gate";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Booking, Technician, User } from "@/lib/types/database";
import { Calendar, MapPin, User as UserIcon, Wrench } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";

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
		try {
			const supabase = getSupabaseBrowserClient();
			const { data: bookingData } = await supabase.from("taas_bookings").select("*").eq("id", id).single();
			if (bookingData) {
				setBooking(bookingData as Booking & { id: string });
				const { data: techData } = await supabase.from("taas_technicians").select("*").eq("id", bookingData.technician_id).single();
				if (techData) setTechnician(techData as Technician & { id: string });
				const { data: userData } = await supabase.from("taas_users").select("*").eq("id", bookingData.client_id).single();
				if (userData) setClient(userData as User & { id: string });
			}
		} catch (error) {
			console.error("Error loading booking:", error);
		} finally {
			setLoading(false);
		}
	}

	async function handleUpdateStatus(newStatus: string) {
		if (!booking) return;
		setUpdating(true);
		try {
			const result = await updateBookingStatus(id, newStatus);
			if (result.success) {
				setBooking((prev) => (prev ? { ...prev, status: newStatus as Booking["status"] } : null));
			} else {
				alert(result.error || "Failed to update status");
			}
		} catch (error) {
			console.error("Error updating status:", error);
			alert("Failed to update status");
		} finally {
			setUpdating(false);
		}
	}

	async function handleUpdateLead(field: "contacted" | "closed", value: boolean) {
		if (!booking) return;
		setUpdating(true);
		try {
			const leadData: Record<string, boolean> = {};
			if (field === "contacted") {
				leadData.contacted = value;
				leadData.closed = booking.lead_closed;
			} else {
				leadData.contacted = booking.lead_contacted;
				leadData.closed = value;
			}

			const result = await updateBookingLead(id, leadData);
			if (result.success) {
				setBooking((prev) =>
					prev
						? {
								...prev,
								lead_contacted: field === "contacted" ? value : prev.lead_contacted,
								lead_closed: field === "closed" ? value : prev.lead_closed,
							}
						: null,
				);
			} else {
				alert(result.error || "Failed to update lead status");
			}
		} catch (error) {
			console.error("Error updating lead:", error);
			alert("Failed to update lead status");
		} finally {
			setUpdating(false);
		}
	}

	if (loading) return <div className="container mx-auto p-4">Loading...</div>;
	if (!booking) return <div className="container mx-auto p-4">Booking not found</div>;

	const preferredDate = new Date(booking.preferred_date_time);

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
						<Select value={booking.status} onValueChange={handleUpdateStatus} disabled={updating}>
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
								<Checkbox id="contacted" checked={booking.lead_contacted} onCheckedChange={(checked) => handleUpdateLead("contacted", checked === true)} disabled={updating} />
								<label htmlFor="contacted" className="cursor-pointer">
									Contacted
								</label>
							</div>
							<div className="flex items-center space-x-2">
								<Checkbox id="closed" checked={booking.lead_closed} onCheckedChange={(checked) => handleUpdateLead("closed", checked === true)} disabled={updating} />
								<label htmlFor="closed" className="cursor-pointer">
									Closed
								</label>
							</div>
						</div>
					</div>
					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
								<UserIcon className="h-4 w-4" />
								<span className="font-medium">Client</span>
							</div>
							<p className="text-lg font-semibold">{client?.display_name || client?.email || "Unknown"}</p>
							<Link href={`/admin/clients/${booking.client_id}`} className="text-sm text-primary underline">
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
				</CardContent>
			</Card>
		</div>
	);
}
