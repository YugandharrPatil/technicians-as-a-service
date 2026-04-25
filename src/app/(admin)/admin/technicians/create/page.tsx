"use client";

import { createTechnician } from "@/actions/admin";
import { AdminGate } from "@/components/auth/admin-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Popular US cities for serviceable areas
const POPULAR_US_CITIES = [
	"New York",
	"Los Angeles",
	"Chicago",
	"Houston",
	"Phoenix",
	"Philadelphia",
	"San Antonio",
	"San Diego",
	"Dallas",
	"San Jose",
	"Austin",
	"Jacksonville",
	"Fort Worth",
	"Columbus",
	"Charlotte",
	"San Francisco",
	"Indianapolis",
	"Seattle",
	"Denver",
	"Washington",
	"Boston",
	"El Paso",
	"Nashville",
	"Detroit",
	"Oklahoma City",
	"Portland",
	"Las Vegas",
	"Memphis",
	"Louisville",
	"Baltimore",
	"Milwaukee",
	"Albuquerque",
	"Tucson",
	"Fresno",
	"Sacramento",
	"Kansas City",
	"Mesa",
	"Atlanta",
	"Omaha",
	"Colorado Springs",
	"Raleigh",
	"Miami",
	"Virginia Beach",
	"Oakland",
	"Minneapolis",
	"Tulsa",
	"Cleveland",
	"Wichita",
	"Arlington",
	"Tampa",
	"New Orleans",
].sort();

// Common tags for technicians
const COMMON_TAGS = [
	"licensed",
	"insured",
	"emergency",
	"24/7",
	"residential",
	"commercial",
	"wiring",
	"plumbing",
	"hvac",
	"repairs",
	"installation",
	"maintenance",
	"energy-efficient",
	"eco-friendly",
	"same-day",
	"warranty",
	"experienced",
	"certified",
	"background-checked",
	"free-estimate",
	"senior-discount",
].sort();

const technicianSchema = z.object({
	name: z.string().min(1, "Name is required"),
	jobTypes: z.array(z.enum(["plumber", "electrician", "carpenter", "maintenance", "hvac", "appliance_repair", "handyman", "carpentry"])).min(1, "Select at least one job type"),
	bio: z.string().min(10, "Bio must be at least 10 characters"),
	tags: z.array(z.string()).min(1, "Select at least one tag"),
	cities: z.array(z.string()).min(1, "Select at least one city"),
	isVisible: z.boolean(),
	photoUrl: z.string().optional(),
});

type TechnicianFormValues = z.infer<typeof technicianSchema>;

export default function CreateTechnicianPage() {
	return (
		<AdminGate>
			<CreateTechnicianContent />
		</AdminGate>
	);
}

function CreateTechnicianContent() {
	const router = useRouter();
	const { user } = useAuth();
	const queryClient = useQueryClient();
	const [submitting, setSubmitting] = useState(false);
	const [uploadingPhoto, setUploadingPhoto] = useState(false);
	const [photoFile, setPhotoFile] = useState<File | null>(null);
	const [photoPreview, setPhotoPreview] = useState<string | null>(null);

	const form = useForm<TechnicianFormValues>({
		resolver: zodResolver(technicianSchema),
		defaultValues: {
			name: "",
			jobTypes: [],
			bio: "",
			tags: [],
			cities: [],
			isVisible: true,
			photoUrl: undefined,
		},
	});

	async function uploadPhoto(file: File): Promise<string> {
		if (!user) throw new Error("You must be authenticated to upload photos");
		if (file.size > 5 * 1024 * 1024) throw new Error("File size must be less than 5MB");
		if (!file.type.startsWith("image/")) throw new Error("File must be an image");

		const supabase = getSupabaseBrowserClient();
		const timestamp = Date.now();
		const ext = file.name.split(".").pop() || "jpg";
		const filename = `${timestamp}_admin.${ext}`;

		const { error } = await supabase.storage.from("technician-photos").upload(filename, file, { upsert: true });
		if (error) throw new Error("Failed to upload photo: " + error.message);

		const { data: urlData } = supabase.storage.from("technician-photos").getPublicUrl(filename);
		return urlData.publicUrl;
	}

	async function onSubmit(data: TechnicianFormValues) {
		setSubmitting(true);
		try {
			let photoUrl = data.photoUrl;

			// Upload photo if file is selected
			if (photoFile) {
				setUploadingPhoto(true);
				try {
					photoUrl = await uploadPhoto(photoFile);
				} catch (error) {
					console.error("Error uploading photo:", error);
					alert(error instanceof Error ? error.message : "Failed to upload photo");
					setUploadingPhoto(false);
					setSubmitting(false);
					return;
				} finally {
					setUploadingPhoto(false);
				}
			}

			const result = await createTechnician({
				...data,
				photoUrl,
			});

			if (result.success && result.id) {
				queryClient.invalidateQueries({ queryKey: ["admin-technicians"] });
				router.push(`/admin/technicians/${result.id}`);
			} else {
				alert(result.error || "Failed to create technician");
			}
		} catch (error) {
			console.error("Error creating technician:", error);
			alert("Failed to create technician");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="container mx-auto max-w-2xl p-4">
			<Link href="/admin/technicians" className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground">
				← Back to Technicians
			</Link>

			<Card>
				<CardHeader>
					<CardTitle>Create Technician</CardTitle>
					<CardDescription>Add a new technician to the platform</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Name</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="jobTypes"
								render={() => (
									<FormItem>
										<FormLabel>Job Types</FormLabel>
										<div className="space-y-2">
											{(["plumber", "electrician", "carpenter", "maintenance", "hvac", "appliance_repair", "handyman", "carpentry"] as const).map((type) => (
												<FormField
													key={type}
													control={form.control}
													name="jobTypes"
													render={({ field }) => (
														<FormItem className="flex items-center space-x-2 space-y-0">
															<FormControl>
																<Checkbox
																	checked={field.value?.includes(type)}
																	onCheckedChange={(checked) => {
																		const current = field.value || [];
																		field.onChange(checked ? [...current, type] : current.filter((t) => t !== type));
																	}}
																/>
															</FormControl>
															<FormLabel className="font-normal capitalize">{type}</FormLabel>
														</FormItem>
													)}
												/>
											))}
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="bio"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Bio</FormLabel>
										<FormControl>
											<Textarea {...field} rows={4} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="tags"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Tags</FormLabel>
										<FormControl>
											<MultiSelect options={COMMON_TAGS} selected={field.value || []} onChange={field.onChange} placeholder="Select tags..." />
										</FormControl>
										<FormDescription>Select relevant tags for this technician</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="cities"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Serviceable Cities</FormLabel>
										<FormControl>
											<MultiSelect options={POPULAR_US_CITIES} selected={field.value || []} onChange={field.onChange} placeholder="Select cities..." />
										</FormControl>
										<FormDescription>Select cities where this technician provides services</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="photoUrl"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Photo (Optional)</FormLabel>
										<FormControl>
											<div className="space-y-2">
												{photoPreview ? (
													<div className="relative inline-block">
														<img src={photoPreview} alt="Preview" className="h-32 w-32 rounded-lg object-cover border" />
														<button
															type="button"
															onClick={() => {
																setPhotoFile(null);
																setPhotoPreview(null);
																field.onChange(undefined);
															}}
															className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-1 hover:bg-destructive/90"
														>
															<X className="h-4 w-4" />
														</button>
													</div>
												) : (
													<div className="flex items-center gap-2">
														<Input
															type="file"
															accept="image/*"
															onChange={(e) => {
																const file = e.target.files?.[0];
																if (file) {
																	// Validate file size
																	if (file.size > 5 * 1024 * 1024) {
																		alert("File size must be less than 5MB");
																		return;
																	}
																	setPhotoFile(file);
																	const reader = new FileReader();
																	reader.onloadend = () => {
																		setPhotoPreview(reader.result as string);
																	};
																	reader.readAsDataURL(file);
																}
															}}
															className="cursor-pointer"
														/>
													</div>
												)}
												{uploadingPhoto && <p className="text-sm text-muted-foreground">Uploading photo...</p>}
											</div>
										</FormControl>
										<FormDescription>Upload a photo (max 5MB). JPG, PNG, or WebP formats.</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="isVisible"
								render={({ field }) => (
									<FormItem className="flex items-center space-x-2 space-y-0">
										<FormControl>
											<Checkbox checked={field.value} onCheckedChange={field.onChange} />
										</FormControl>
										<FormLabel className="font-normal">Visible to clients</FormLabel>
									</FormItem>
								)}
							/>

							<Button type="submit" className="w-full" disabled={submitting || uploadingPhoto}>
								{submitting || uploadingPhoto ? "Creating..." : "Create Technician"}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}
