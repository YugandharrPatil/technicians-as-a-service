"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { buildEmbeddingText, generateEmbedding } from "@/lib/embeddings";
import { getPineconeIndex } from "@/lib/pinecone";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

// ─── Schemas ─────────────────────────────────────────────

const technicianSchema = z.object({
	name: z.string().min(1),
	jobTypes: z.array(z.enum(["plumber", "electrician", "carpenter", "maintenance", "hvac", "appliance_repair", "handyman", "carpentry"])),
	bio: z.string().min(10),
	tags: z.array(z.string()),
	cities: z.array(z.string().min(1)),
	isVisible: z.boolean(),
	photoUrl: z.string().optional(),
	userId: z.string().optional(),
});

const technicianUpdateSchema = z.object({
	name: z.string().min(1).optional(),
	jobTypes: z.array(z.enum(["plumber", "electrician", "carpenter", "maintenance", "hvac", "appliance_repair", "handyman", "carpentry"])).optional(),
	bio: z.string().min(10).optional(),
	tags: z.array(z.string()).optional(),
	cities: z.array(z.string().min(1)).optional(),
	isVisible: z.boolean().optional(),
	photoUrl: z.string().optional(),
});

// ─── Technician Actions ──────────────────────────────────

export async function createTechnician(input: z.infer<typeof technicianSchema>) {
	try {
		await requireAdmin();
	} catch {
		return { error: "Unauthorized: Admin access required" };
	}

	try {
		const supabase = getSupabaseServiceClient();
		const data = technicianSchema.parse(input);

		const { data: newTech, error: insertError } = await supabase
			.from("taas_technicians")
			.insert({
				name: data.name,
				job_types: data.jobTypes,
				bio: data.bio,
				tags: data.tags,
				cities: data.cities,
				is_visible: data.isVisible,
				photo_url: data.photoUrl,
				user_id: data.userId,
			})
			.select("id")
			.single();

		if (insertError || !newTech) {
			return { error: "Failed to create technician" };
		}

		// Generate embedding and upsert to Pinecone
		try {
			const embeddingText = buildEmbeddingText({
				name: data.name,
				jobTypes: data.jobTypes,
				bio: data.bio,
				tags: data.tags,
				cities: data.cities,
			});

			const embedding = await generateEmbedding(embeddingText);
			const index = await getPineconeIndex();
			const pineconeId = `technician:${newTech.id}`;

			await index.upsert([
				{
					id: pineconeId,
					values: embedding,
					metadata: {
						jobTypes: data.jobTypes,
						tags: data.tags,
						cities: data.cities,
						isVisible: data.isVisible,
						technicianId: newTech.id,
					},
				},
			]);

			await supabase
				.from("taas_technicians")
				.update({
					embedding: {
						provider: "gemini",
						model: "text-embedding-004",
						pineconeId,
						updatedAt: new Date().toISOString(),
					},
				})
				.eq("id", newTech.id);
		} catch (embeddingError) {
			console.error("Error generating embedding:", embeddingError);
			await supabase
				.from("taas_technicians")
				.update({
					embedding: {
						provider: "gemini",
						model: "text-embedding-004",
						pineconeId: "",
						updatedAt: new Date().toISOString(),
						error: "Failed to generate embedding",
					},
				})
				.eq("id", newTech.id);
		}

		return { id: newTech.id, success: true };
	} catch (error) {
		if (error instanceof z.ZodError) {
			return { error: "Validation error", details: error.issues };
		}
		console.error("Error creating technician:", error);
		return { error: "Failed to create technician" };
	}
}

export async function updateTechnician(id: string, input: z.infer<typeof technicianUpdateSchema>) {
	try {
		await requireAdmin();
	} catch {
		return { error: "Unauthorized: Admin access required" };
	}

	try {
		const supabase = getSupabaseServiceClient();
		const data = technicianUpdateSchema.parse(input);

		const { data: existing, error: fetchError } = await supabase.from("taas_technicians").select("*").eq("id", id).single();
		if (fetchError || !existing) return { error: "Technician not found" };

		const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
		if (data.name !== undefined) updates.name = data.name;
		if (data.jobTypes !== undefined) updates.job_types = data.jobTypes;
		if (data.bio !== undefined) updates.bio = data.bio;
		if (data.tags !== undefined) updates.tags = data.tags;
		if (data.cities !== undefined) updates.cities = data.cities;
		if (data.isVisible !== undefined) updates.is_visible = data.isVisible;
		if (data.photoUrl !== undefined) updates.photo_url = data.photoUrl;

		await supabase.from("taas_technicians").update(updates).eq("id", id);

		const fieldsChanged = data.name || data.jobTypes || data.bio || data.tags || data.cities;
		if (fieldsChanged) {
			try {
				const finalData = { ...existing, ...updates };
				const embeddingText = buildEmbeddingText({
					name: finalData.name as string,
					jobTypes: (finalData.job_types || finalData.jobTypes) as string[],
					bio: finalData.bio as string,
					tags: finalData.tags as string[],
					cities: finalData.cities as string[],
				});
				const embedding = await generateEmbedding(embeddingText);
				const index = await getPineconeIndex();
				const pineconeId = `technician:${id}`;
				await index.upsert([
					{
						id: pineconeId,
						values: embedding,
						metadata: { jobTypes: finalData.job_types || finalData.jobTypes, tags: finalData.tags, cities: finalData.cities, isVisible: finalData.is_visible ?? true, technicianId: id },
					},
				]);
				const embeddingMeta = existing.embedding || {};
				await supabase
					.from("taas_technicians")
					.update({
						embedding: { ...embeddingMeta, pineconeId, updatedAt: new Date().toISOString() },
					})
					.eq("id", id);
			} catch (embeddingError) {
				console.error("Error updating embedding:", embeddingError);
			}
		}

		return { success: true };
	} catch (error) {
		if (error instanceof z.ZodError) return { error: "Validation error", details: error.issues };
		console.error("Error updating technician:", error);
		return { error: "Failed to update technician" };
	}
}

export async function deleteTechnician(id: string) {
	try {
		await requireAdmin();
	} catch {
		return { error: "Unauthorized: Admin access required" };
	}

	try {
		const supabase = getSupabaseServiceClient();
		await supabase.from("taas_technicians").delete().eq("id", id);
		try {
			const index = await getPineconeIndex();
			await index.deleteOne(`technician:${id}`);
		} catch (error) {
			console.error("Error deleting from Pinecone:", error);
		}
		return { success: true };
	} catch (error) {
		console.error("Error deleting technician:", error);
		return { error: "Failed to delete technician" };
	}
}

export async function getAdminTechnicians() {
	try {
		await requireAdmin();
	} catch {
		throw new Error("Unauthorized: Admin access required");
	}

	const supabase = getSupabaseServiceClient();
	const { data: technicians, error } = await supabase.from("taas_technicians").select("*");
	if (error) throw error;
	return technicians;
}

export async function getAdminTechnician(id: string) {
	try {
		await requireAdmin();
	} catch {
		throw new Error("Unauthorized: Admin access required");
	}

	const supabase = getSupabaseServiceClient();
	const { data, error } = await supabase.from("taas_technicians").select("*").eq("id", id).single();
	if (error || !data) throw new Error("Technician not found");
	return data;
}

// ─── Booking Actions ─────────────────────────────────────

export async function updateBookingStatus(id: string, status: string) {
	try {
		await requireAdmin();
	} catch {
		return { error: "Unauthorized: Admin access required" };
	}

	try {
		const supabase = getSupabaseServiceClient();
		const { error } = await supabase
			.from("taas_bookings")
			.update({
				status,
				updated_at: new Date().toISOString(),
			})
			.eq("id", id);
		if (error) throw error;
		return { success: true };
	} catch (error) {
		console.error("Error updating booking status:", error);
		return { error: "Failed to update booking status" };
	}
}

export async function updateBookingLead(id: string, lead: { contacted?: boolean; closed?: boolean }) {
	try {
		await requireAdmin();
	} catch {
		return { error: "Unauthorized: Admin access required" };
	}

	try {
		const supabase = getSupabaseServiceClient();
		const updates: Record<string, unknown> = {
			updated_at: new Date().toISOString(),
		};

		if (lead.contacted !== undefined) updates.lead_contacted = lead.contacted;
		if (lead.closed !== undefined) updates.lead_closed = lead.closed;

		const { error } = await supabase.from("taas_bookings").update(updates).eq("id", id);
		if (error) throw error;
		return { success: true };
	} catch (error) {
		console.error("Error updating booking lead:", error);
		return { error: "Failed to update booking lead" };
	}
}

// ─── Seed Action ─────────────────────────────────────────

const dummyTechnicians = [
	{
		name: "John Smith",
		job_types: ["plumber"],
		bio: "Experienced plumber with 15 years of expertise in residential and commercial plumbing. Specializes in leak repairs, pipe installations, and bathroom renovations.",
		tags: ["bathroom fittings", "leak repair", "pipe installation", "water heater"],
		cities: ["New York", "Brooklyn", "Queens"],
		is_visible: true,
	},
	{
		name: "Sarah Johnson",
		job_types: ["electrician"],
		bio: "Licensed electrician providing safe and reliable electrical services. Expert in wiring, panel upgrades, and smart home installations.",
		tags: ["AC wiring", "panel upgrade", "smart home", "outlet installation"],
		cities: ["Los Angeles", "San Francisco", "San Diego"],
		is_visible: true,
	},
	{
		name: "Mike Davis",
		job_types: ["carpenter"],
		bio: "Master carpenter specializing in custom furniture, cabinet making, and home renovations. Quality craftsmanship guaranteed.",
		tags: ["furniture repair", "cabinet making", "custom furniture", "trim work"],
		cities: ["Chicago", "Milwaukee", "Detroit"],
		is_visible: true,
	},
	{
		name: "Emily Chen",
		job_types: ["plumber", "electrician"],
		bio: "Multi-skilled technician offering both plumbing and electrical services. Perfect for home renovation projects requiring both trades.",
		tags: ["bathroom renovation", "kitchen wiring", "fixture installation", "outlet repair"],
		cities: ["Seattle", "Portland", "Vancouver"],
		is_visible: true,
	},
	{
		name: "Robert Wilson",
		job_types: ["plumber"],
		bio: "Emergency plumber available 24/7. Quick response time for urgent repairs including burst pipes, clogged drains, and water leaks.",
		tags: ["emergency service", "drain cleaning", "burst pipe repair", "sewer line"],
		cities: ["Miami", "Tampa", "Orlando"],
		is_visible: true,
	},
	{
		name: "Lisa Anderson",
		job_types: ["electrician"],
		bio: "Residential electrician focused on safety and code compliance. Specializes in home rewiring, lighting design, and electrical troubleshooting.",
		tags: ["home rewiring", "lighting design", "electrical troubleshooting", "GFCI installation"],
		cities: ["Boston", "Cambridge", "Worcester"],
		is_visible: true,
	},
	{
		name: "David Martinez",
		job_types: ["carpenter"],
		bio: "Professional carpenter with expertise in deck building, fence installation, and structural repairs. Licensed and insured.",
		tags: ["deck building", "fence installation", "structural repair", "siding"],
		cities: ["Dallas", "Houston", "Austin"],
		is_visible: true,
	},
	{
		name: "Jennifer Brown",
		job_types: ["plumber"],
		bio: "Female plumber providing professional plumbing services. Specializes in bathroom and kitchen installations with attention to detail.",
		tags: ["bathroom installation", "kitchen plumbing", "faucet repair", "toilet installation"],
		cities: ["Phoenix", "Tucson", "Scottsdale"],
		is_visible: true,
	},
	{
		name: "James Taylor",
		job_types: ["electrician", "carpenter"],
		bio: "Handyman offering electrical and carpentry services. Ideal for small projects and repairs around the house.",
		tags: ["handyman", "small repairs", "electrical fixes", "woodwork"],
		cities: ["Denver", "Boulder", "Colorado Springs"],
		is_visible: true,
	},
	{
		name: "Amanda White",
		job_types: ["carpenter"],
		bio: "Custom woodworker creating beautiful pieces for your home. From built-in shelving to custom tables, quality is guaranteed.",
		tags: ["custom woodwork", "built-in shelving", "custom tables", "finishing work"],
		cities: ["Atlanta", "Savannah", "Augusta"],
		is_visible: true,
	},
];

export async function seedTechnicians() {
	try {
		await requireAdmin();
	} catch {
		return { error: "Unauthorized: Admin access required" };
	}

	try {
		const supabase = getSupabaseServiceClient();
		const { error } = await supabase.from("taas_technicians").insert(dummyTechnicians);
		if (error) throw error;
		return { success: true, message: `Created ${dummyTechnicians.length} technicians` };
	} catch (error) {
		console.error("Error seeding technicians:", error);
		return { error: "Failed to seed technicians" };
	}
}
