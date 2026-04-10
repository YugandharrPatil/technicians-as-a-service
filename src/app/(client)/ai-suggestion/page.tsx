import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function AISuggestionPage() {
	return (
		<div className="container mx-auto max-w-2xl p-4">
			<Card>
				<CardHeader>
					<CardTitle>AI-Powered Technician Suggestions</CardTitle>
					<CardDescription>This feature will be available in a future update. For now, please browse our technician catalogue.</CardDescription>
				</CardHeader>
				<CardContent>
					<Button asChild>
						<Link href="/technicians">Browse Technicians</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
