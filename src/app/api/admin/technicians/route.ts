import { requireAdmin } from "@/lib/auth/admin";
import { buildEmbeddingText, generateEmbedding } from "@/lib/embeddings";
import { getPineconeIndex } from "@/lib/pinecone";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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

export async function POST(request: NextRequest) {
	try {
		try {
			await requireAdmin();
		} catch {
			return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 });
		}

		const supabase = getSupabaseServiceClient();
		const body = await request.json();
		const data = technicianSchema.parse(body);

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
			return NextResponse.json({ error: "Failed to create technician" }, { status: 500 });
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

		return NextResponse.json({ id: newTech.id, success: true });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
		}
		console.error("Error creating technician:", error);
		return NextResponse.json({ error: "Failed to create technician" }, { status: 500 });
	}
}

export async function GET(request: NextRequest) {
	try {
		await requireAdmin();
		const supabase = getSupabaseServiceClient();
		const { data: technicians, error } = await supabase.from("taas_technicians").select("*");
		if (error) throw error;
		return NextResponse.json({ technicians });
	} catch (error) {
		console.error("Error fetching technicians:", error);
		return NextResponse.json({ error: "Failed to fetch technicians" }, { status: 500 });
	}
}
