"use client";

import { useAuth } from "@/lib/auth/context";
import { getUserAction, getTechnicianByUserIdAction } from "@/actions/client-db";
import { SignIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface LoginProps {
	role: "client" | "technician";
}

export function Login({ role }: LoginProps) {
	const { user: clerkUser, isLoaded } = useUser();
	const { syncUser } = useAuth();
	const router = useRouter();

	useEffect(() => {
		async function handlePostSignIn() {
			if (!isLoaded || !clerkUser) return;

			// Sync user with specific role
			await syncUser(role);

			const userData = await getUserAction(clerkUser.id);

			if (userData) {
				const userRoles: string[] = userData.roles || (userData.role ? [userData.role] : []);

				if (role === "client") {
					if (userData.role === "client" || userRoles.includes("client")) {
						router.push("/technicians"); // technicians browsing page
					} else if (userData.role === "technician" || userRoles.includes("technician")) {
						router.push("/technician/login");
					}
				} else if (role === "technician") {
					if (userData.role === "technician" || userRoles.includes("technician")) {
						// Check if technician profile exists
						const techData = await getTechnicianByUserIdAction(clerkUser.id);

						if (!techData) {
							router.push("/technician/profile");
						} else {
							router.push("/technician/dashboard");
						}
					}
				}
			} else if (role === "client") {
				router.push("/technicians");
			}
		}

		handlePostSignIn();
	}, [clerkUser, isLoaded, role, router, syncUser]);

	if (isLoaded && clerkUser) {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<div className="text-muted-foreground">Redirecting...</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center p-4 flex-col gap-4">
			<h1 className="text-2xl font-bold text-center">{role === "client" ? "Client Login Portal" : "Technician Login Portal"}</h1>
			<SignIn
				routing="hash"
				appearance={{
					elements: {
						rootBox: "mx-auto",
						card: "shadow-lg",
					},
				}}
			/>
		</div>
	);
}
