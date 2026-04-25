"use server";

import { requireTechnician } from "@/lib/auth/technician";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const technicianSchema = z.object({
	name: z.string().min(1),
	jobTypes: z.array(z.enum(["plumber", "electrician", "carpenter", "maintenance", "hvac", "appliance_repair", "handyman", "carpentry"])),
	bio: z.string().min(10),
	tags: z.array(z.string()),
	cities: z.array(z.string().min(1)),
	isVisible: z.boolean(),
	photoUrl: z.string().optional(),
});

export async function createTechnicianProfile(input: z.infer<typeof technicianSchema>) {
	let decodedToken;
	try {
		decodedToken = await requireTechnician();
	} catch {
		return { error: "Unauthorized" };
	}

	try {
		const uid = decodedToken.uid;
		const supabase = getSupabaseServiceClient();

		// Check if user is a technician
		const { data: userData } = await supabase.from("taas_users").select("*").eq("id", uid).single();
		if (!userData) return { error: "User not found" };
		if (userData.role !== "technician") return { error: "User is not a technician" };

		// Check if technician profile already exists
		const { data: existingTech } = await supabase.from("taas_technicians").select("id").eq("user_id", uid).single();
		if (existingTech) return { error: "Technician profile already exists. Use update instead." };

		const validatedData = technicianSchema.parse(input);

		const { data: newTech, error } = await supabase
			.from("taas_technicians")
			.insert({
				user_id: uid,
				name: validatedData.name,
				job_types: validatedData.jobTypes,
				bio: validatedData.bio,
				tags: validatedData.tags,
				cities: validatedData.cities,
				is_visible: validatedData.isVisible,
				photo_url: validatedData.photoUrl,
			})
			.select("id")
			.single();

		if (error || !newTech) return { error: "Failed to create profile" };

		return { id: newTech.id, success: true, message: "Technician profile created successfully" };
	} catch (error) {
		console.error("Error creating technician profile:", error);
		if (error instanceof z.ZodError) return { error: "Validation error", issues: error.issues };
		return { error: error instanceof Error ? error.message : "Failed to create technician profile" };
	}
}

export async function updateTechnicianProfile(input: z.infer<typeof technicianSchema>) {
	let decodedToken;
	try {
		decodedToken = await requireTechnician();
	} catch {
		return { error: "Unauthorized" };
	}

	try {
		const uid = decodedToken.uid;
		const supabase = getSupabaseServiceClient();

		const { data: userData } = await supabase.from("taas_users").select("*").eq("id", uid).single();
		if (!userData) return { error: "User not found" };
		if (userData.role !== "technician") return { error: "User is not a technician" };

		const { data: existingTech } = await supabase.from("taas_technicians").select("id").eq("user_id", uid).single();
		if (!existingTech) return { error: "Technician profile not found. Create one first." };

		const validatedData = technicianSchema.parse(input);

		const { error } = await supabase
			.from("taas_technicians")
			.update({
				name: validatedData.name,
				job_types: validatedData.jobTypes,
				bio: validatedData.bio,
				tags: validatedData.tags,
				cities: validatedData.cities,
				is_visible: validatedData.isVisible,
				photo_url: validatedData.photoUrl,
				updated_at: new Date().toISOString(),
			})
			.eq("id", existingTech.id);

		if (error) return { error: "Failed to update profile" };

		return { id: existingTech.id, success: true, message: "Technician profile updated successfully" };
	} catch (error) {
		console.error("Error updating technician profile:", error);
		if (error instanceof z.ZodError) return { error: "Validation error", issues: error.issues };
		return { error: error instanceof Error ? error.message : "Failed to update technician profile" };
	}
}
