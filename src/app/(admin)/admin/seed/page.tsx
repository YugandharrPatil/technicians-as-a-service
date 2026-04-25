"use client";

import { seedTechnicians } from "@/actions/admin";
import { AdminGate } from "@/components/auth/admin-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function SeedPage() {
	return (
		<AdminGate>
			<SeedContent />
		</AdminGate>
	);
}

function SeedContent() {
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");
	const queryClient = useQueryClient();

	const handleSeed = async () => {
		setLoading(true);
		setMessage("");
		try {
			const result = await seedTechnicians();
			if (result.success) {
				setMessage(`Success: ${result.message}`);
				queryClient.invalidateQueries({ queryKey: ["admin-technicians"] });
			} else {
				setMessage(`Error: ${result.error}`);
			}
		} catch (error) {
			setMessage("Error seeding technicians");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="container mx-auto max-w-2xl p-4">
			<Card>
				<CardHeader>
					<CardTitle>Seed Dummy Technicians (Optional)</CardTitle>
					<CardDescription>Helper to create sample technician data. Technicians should be created manually in the database or through the admin panel.</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<Button onClick={handleSeed} disabled={loading}>
							{loading ? "Seeding..." : "Seed Technicians"}
						</Button>
						{message && <div className={`text-sm ${message.includes("Success") ? "text-green-600" : "text-red-600"}`}>{message}</div>}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
