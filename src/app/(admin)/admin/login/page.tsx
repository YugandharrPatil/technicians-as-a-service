"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ADMIN_EMAIL } from "@/lib/auth/admin-client";
import { useClerk, useUser } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
	email: z.string().email({ message: "Invalid email address." }),
	password: z.string().min(1, { message: "Access key is required." }),
});

export default function AdminLoginPage() {
	const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
	const clerk = useClerk();
	const [isLoading, setIsLoading] = useState(false);
	const [mounted, setMounted] = useState(false);
	const router = useRouter();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	useEffect(() => {
		setMounted(true);
	}, []);

	// Redirect if logged in as admin
	useEffect(() => {
		if (isUserLoaded && clerkUser) {
			const userEmail = clerkUser.primaryEmailAddress?.emailAddress;
			const role = clerkUser.publicMetadata?.role;

			if (userEmail === ADMIN_EMAIL || role === "admin") {
				router.push("/admin/dashboard");
			}
		}
	}, [clerkUser, isUserLoaded, router, ADMIN_EMAIL]);

	// Hide everything until client-side mount to prevent hydration issues
	if (!mounted) return null;

	// Show loading only while user state is unknown
	if (!isUserLoaded) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
			</div>
		);
	}

	// Handle case where user is logged in but NOT an admin
	if (clerkUser) {
		const userEmail = clerkUser.primaryEmailAddress?.emailAddress;
		const role = clerkUser.publicMetadata?.role;

		if (userEmail !== ADMIN_EMAIL && role !== "admin") {
			return (
				<div className="min-h-screen flex items-center justify-center p-4">
					<Card className="w-full max-w-md">
						<CardHeader className="text-center">
							<div className="flex justify-center mb-4">
								<AlertCircle className="w-10 h-10 text-destructive" />
							</div>
							<CardTitle className="text-2xl font-bold">Access Denied</CardTitle>
							<CardDescription>Your account does not have administrative privileges required to access this area.</CardDescription>
						</CardHeader>
						<CardContent className="text-center">
							<p className="text-sm text-muted-foreground">
								Signed in as: <span className="font-medium text-foreground">{userEmail}</span>
							</p>
						</CardContent>
						<CardFooter className="flex flex-col gap-3">
							<Button className="w-full" onClick={() => router.push("/")}>
								<ArrowLeft className="mr-2 h-4 w-4" />
								Back to Landing Page
							</Button>
							<Button variant="ghost" className="w-full" onClick={() => clerk.signOut(() => router.push("/admin/login"))}>
								Sign Out and Switch Account
							</Button>
						</CardFooter>
					</Card>
				</div>
			);
		}

		return (
			<div className="min-h-screen flex items-center justify-center text-muted-foreground gap-3">
				<Loader2 className="w-5 h-5 animate-spin" />
				Verifying access...
			</div>
		);
	}

	async function onSubmit(data: z.infer<typeof formSchema>) {
		if (!clerk.client) return;

		setIsLoading(true);
		try {
			const result = await clerk.client.signIn.create({
				identifier: data.email,
				password: data.password,
			});

			if (result.status === "complete") {
				await clerk.setActive({ session: result.createdSessionId });
				toast.success("Authentication successful");
				router.push("/admin/dashboard");
			} else {
				console.error("Sign in status not complete:", result.status);
				toast.error("Login flow incomplete. Please try again.");
			}
		} catch (err: any) {
			console.error("Login error:", err);
			const errorMessage = err.errors?.[0]?.message || "Invalid credentials. Please try again.";
			toast.error(errorMessage);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="space-y-1 text-center">
					<CardTitle className="text-2xl font-bold tracking-tight">Admin Portal</CardTitle>
					<CardDescription>Institutional access gateway</CardDescription>
				</CardHeader>

				<form onSubmit={form.handleSubmit(onSubmit)}>
					<CardContent className="space-y-4 pt-4">
						<FieldGroup>
							<Controller
								name="email"
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor="email">Email</FieldLabel>
										<FieldContent>
											<Input {...field} id="email" type="email" placeholder="admin@taas.com" aria-invalid={fieldState.invalid} />
											{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
										</FieldContent>
									</Field>
								)}
							/>
							<Controller
								name="password"
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<div className="flex items-center justify-between">
											<FieldLabel htmlFor="password">Password</FieldLabel>
											<button
												type="button"
												onClick={() => {
													form.setValue("email", ADMIN_EMAIL, { shouldValidate: true });
													form.setValue("password", "Admin_Password_2024!", { shouldValidate: true });
													toast.success("Demo credentials applied");
												}}
												className="text-xs text-muted-foreground hover:text-primary transition-colors"
											>
												Fill Demo Credentials
											</button>
										</div>
										<FieldContent>
											<Input {...field} id="password" type="password" placeholder="••••••••" aria-invalid={fieldState.invalid} />
											{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
										</FieldContent>
									</Field>
								)}
							/>
						</FieldGroup>
					</CardContent>

					<CardFooter>
						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Log In
						</Button>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
