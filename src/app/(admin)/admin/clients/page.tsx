"use client";

import { AdminGate } from "@/components/auth/admin-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@/lib/types/database";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminClientsPage() {
	return (
		<AdminGate>
			<AdminClientsContent />
		</AdminGate>
	);
}

function AdminClientsContent() {
	const [clients, setClients] = useState<(User & { id: string })[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadClients();
	}, []);

	async function loadClients() {
		try {
			const supabase = getSupabaseBrowserClient();
			const { data, error } = await supabase.from("taas_users").select("*");
			if (error) throw error;
			setClients((data || []) as (User & { id: string })[]);
		} catch (error) {
			console.error("Error loading clients:", error);
		} finally {
			setLoading(false);
		}
	}

	if (loading) return <div className="container mx-auto p-4">Loading...</div>;

	return (
		<div className="container mx-auto p-4">
			<h1 className="mb-6 text-3xl font-bold">Clients</h1>
			{clients.length === 0 ? (
				<Card>
					<CardContent className="py-8 text-center text-muted-foreground">No clients found.</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{clients.map((client) => (
						<Card key={client.id}>
							<CardHeader>
								<CardTitle>{client.display_name || "No Name"}</CardTitle>
								<CardDescription>{client.email}</CardDescription>
							</CardHeader>
							<CardContent>
								<Link href={`/admin/clients/${client.id}`}>
									<Button variant="outline" className="w-full">
										View Profile
									</Button>
								</Link>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
