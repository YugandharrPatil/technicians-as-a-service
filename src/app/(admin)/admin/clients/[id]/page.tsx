"use client";

import { AdminGate } from "@/components/auth/admin-gate";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Booking, Technician, User } from "@/lib/types/database";
import Link from "next/link";
import { use, useEffect, useState } from "react";

export default function AdminClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params);
	return (
		<AdminGate>
			<AdminClientDetailContent id={id} />
		</AdminGate>
	);
}

type BookingWithTechnician = Booking & { id: string; technician_name?: string };

function AdminClientDetailContent({ id }: { id: string }) {
	const [client, setClient] = useState<(User & { id: string }) | null>(null);
	const [bookings, setBookings] = useState<BookingWithTechnician[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadClient();
	}, [id]);

	async function loadClient() {
		try {
			const supabase = getSupabaseBrowserClient();
			const { data: userData } = await supabase.from("taas_users").select("*").eq("id", id).single();
			if (userData) {
				setClient(userData as User & { id: string });
				const { data: bookingsData } = await supabase.from("taas_bookings").select("*, taas_technicians(name)").eq("client_id", id);

				const mapped: BookingWithTechnician[] = (bookingsData || []).map((b: any) => ({
					...b,
					technician_name: b.taas_technicians?.name,
				}));
				setBookings(mapped);
			}
		} catch (error) {
			console.error("Error loading client:", error);
		} finally {
			setLoading(false);
		}
	}

	if (loading) return <div className="container mx-auto p-4">Loading...</div>;
	if (!client) return <div className="container mx-auto p-4">Client not found</div>;

	return (
		<div className="container mx-auto max-w-4xl p-4">
			<Link href="/admin/clients" className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground">
				← Back to Clients
			</Link>
			<Card className="mb-6">
				<CardHeader>
					<CardTitle>Client Profile</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<p>
							<strong>Name:</strong> {client.display_name || "No Name"}
						</p>
						<p>
							<strong>Email:</strong> {client.email}
						</p>
						<p>
							<strong>Role:</strong> {client.role}
						</p>
					</div>
				</CardContent>
			</Card>
			<div>
				<h2 className="mb-4 text-2xl font-bold">Booking History</h2>
				{bookings.length === 0 ? (
					<Card>
						<CardContent className="py-8 text-center text-muted-foreground">No bookings found for this client.</CardContent>
					</Card>
				) : (
					<div className="space-y-4">
						{bookings.map((booking) => (
							<Card key={booking.id}>
								<CardHeader>
									<div className="flex items-center justify-between">
										<div>
											<CardTitle>{booking.service_type}</CardTitle>
											<CardDescription>{booking.technician_name || "Unknown Technician"}</CardDescription>
										</div>
										<Badge>{booking.status}</Badge>
									</div>
								</CardHeader>
								<CardContent>
									<Link href={`/admin/bookings/${booking.id}`}>
										<button className="text-primary underline">View Booking</button>
									</Link>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
