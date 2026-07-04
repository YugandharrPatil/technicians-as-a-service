"use server";

import { requireTechnician } from "@/lib/auth/technician";
import { db } from "@/db";
import { taasUsers, taasTechnicians } from "@/db/schema";
import { eq } from "drizzle-orm";
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

		// Check if user is a technician
		const [userData] = await db.select().from(taasUsers).where(eq(taasUsers.id, uid)).limit(1);
		if (!userData) return { error: "User not found" };
		if (userData.role !== "technician") return { error: "User is not a technician" };

		// Check if technician profile already exists
		const [existingTech] = await db.select({ id: taasTechnicians.id }).from(taasTechnicians).where(eq(taasTechnicians.user_id, uid)).limit(1);
		if (existingTech) return { error: "Technician profile already exists. Use update instead." };

		const validatedData = technicianSchema.parse(input);
		const newId = crypto.randomUUID();

		await db.insert(taasTechnicians).values({
			id: newId,
			user_id: uid,
			name: validatedData.name,
			job_types: validatedData.jobTypes,
			bio: validatedData.bio,
			tags: validatedData.tags,
			cities: validatedData.cities,
			is_visible: validatedData.isVisible,
			photo_url: validatedData.photoUrl || null,
		});

		return { id: newId, success: true, message: "Technician profile created successfully" };
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

		const [userData] = await db.select().from(taasUsers).where(eq(taasUsers.id, uid)).limit(1);
		if (!userData) return { error: "User not found" };
		if (userData.role !== "technician") return { error: "User is not a technician" };

		const [existingTech] = await db.select({ id: taasTechnicians.id }).from(taasTechnicians).where(eq(taasTechnicians.user_id, uid)).limit(1);
		if (!existingTech) return { error: "Technician profile not found. Create one first." };

		const validatedData = technicianSchema.parse(input);

		await db.update(taasTechnicians)
			.set({
				name: validatedData.name,
				job_types: validatedData.jobTypes,
				bio: validatedData.bio,
				tags: validatedData.tags,
				cities: validatedData.cities,
				is_visible: validatedData.isVisible,
				photo_url: validatedData.photoUrl || null,
				updated_at: new Date().toISOString(),
			})
			.where(eq(taasTechnicians.id, existingTech.id));

		return { id: existingTech.id, success: true, message: "Technician profile updated successfully" };
	} catch (error) {
		console.error("Error updating technician profile:", error);
		if (error instanceof z.ZodError) return { error: "Validation error", issues: error.issues };
		return { error: error instanceof Error ? error.message : "Failed to update technician profile" };
	}
}
