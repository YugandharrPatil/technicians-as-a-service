"use server";

import { db } from "@/db";
import { taasUsers, taasTechnicians, taasBookings, taasChats, taasReviews } from "@/db/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import type { Booking, Technician, User, ChatMessage, Review, JobType } from "@/lib/types/database";

// ─── User Actions ────────────────────────────────────────────────────────────

export async function syncUserAction(input: { id: string; email: string; displayName: string; role?: "client" | "technician" }) {
	const { id, email, displayName, role } = input;

	try {
		const [existingUser] = await db.select().from(taasUsers).where(eq(taasUsers.id, id)).limit(1);

		if (!existingUser) {
			const activeRole = role || "client";
			const newUserVal = {
				id,
				email,
				display_name: displayName,
				role: activeRole,
				roles: [activeRole],
			};
			await db.insert(taasUsers).values(newUserVal);
			const [inserted] = await db.select().from(taasUsers).where(eq(taasUsers.id, id)).limit(1);
			return { user: inserted as unknown as User };
		} else {
			if (role) {
				const existingRoles = existingUser.roles || (existingUser.role ? [existingUser.role] : []);
				const updatedRoles = existingRoles.includes(role) ? existingRoles : [...existingRoles, role];

				await db.update(taasUsers)
					.set({
						role,
						roles: updatedRoles,
						display_name: displayName,
					})
					.where(eq(taasUsers.id, id));

				const [updated] = await db.select().from(taasUsers).where(eq(taasUsers.id, id)).limit(1);
				return { user: updated as unknown as User };
			}
			return { user: existingUser as unknown as User };
		}
	} catch (error) {
		console.error("Error in syncUserAction:", error);
		throw new Error("Failed to sync user");
	}
}

export async function getUserAction(id: string) {
	try {
		const [user] = await db.select().from(taasUsers).where(eq(taasUsers.id, id)).limit(1);
		return user as unknown as User | undefined;
	} catch (error) {
		console.error("Error in getUserAction:", error);
		throw new Error("Failed to get user");
	}
}

// ─── Technician Actions ──────────────────────────────────────────────────────

export async function getTechnicianByUserIdAction(userId: string) {
	try {
		const [technician] = await db.select().from(taasTechnicians).where(eq(taasTechnicians.user_id, userId)).limit(1);
		return technician as unknown as Technician | undefined;
	} catch (error) {
		console.error("Error in getTechnicianByUserIdAction:", error);
		throw new Error("Failed to get technician profile");
	}
}

export async function getTechnicianAction(id: string) {
	try {
		const [technician] = await db.select().from(taasTechnicians).where(eq(taasTechnicians.id, id)).limit(1);
		return technician as unknown as Technician | undefined;
	} catch (error) {
		console.error("Error in getTechnicianAction:", error);
		throw new Error("Failed to get technician");
	}
}

export async function getTechniciansAction(filters: { jobType: string; city: string; minRating: number; tags: string[] }) {
	try {
		const techsData = await db.select().from(taasTechnicians).where(eq(taasTechnicians.is_visible, true));
		const techs = techsData as unknown as Technician[];

		const citiesSet = new Set<string>();
		const tagsSet = new Set<string>();

		techs.forEach((t) => {
			if (t.cities) t.cities.forEach((c) => citiesSet.add(c));
			if (t.tags) t.tags.forEach((tag) => tagsSet.add(tag));
		});

		// Sort by rating
		techs.sort((a, b) => {
			const ratingA = a.rating_avg || 0;
			const ratingB = b.rating_avg || 0;
			return ratingB - ratingA;
		});

		// Apply filters
		let filtered = techs;
		if (filters.jobType !== "all") {
			const jobType = filters.jobType as JobType;
			filtered = filtered.filter((t) => t.job_types && t.job_types.includes(jobType));
		}
		if (filters.city !== "all") {
			const city = filters.city;
			filtered = filtered.filter((t) => t.cities && t.cities.includes(city));
		}
		if (filters.minRating > 0) {
			filtered = filtered.filter((t) => (t.rating_avg || 0) >= filters.minRating);
		}
		if (filters.tags.length > 0) {
			filtered = filtered.filter((t) => t.tags && filters.tags.some((tag) => t.tags.includes(tag)));
		}

		return {
			technicians: filtered,
			availableCities: Array.from(citiesSet).sort(),
			availableTags: Array.from(tagsSet).sort(),
		};
	} catch (error) {
		console.error("Error in getTechniciansAction:", error);
		throw new Error("Failed to get technicians");
	}
}

// ─── Booking Actions ─────────────────────────────────────────────────────────

export async function getBookingsAction(clientId: string) {
	try {
		const bookings = await db.select({
			booking: taasBookings,
			technician: taasTechnicians,
		})
		.from(taasBookings)
		.leftJoin(taasTechnicians, eq(taasBookings.technician_id, taasTechnicians.id))
		.where(eq(taasBookings.client_id, clientId))
		.orderBy(desc(taasBookings.created_at));

		type BookingWithTechnician = Booking & { technician_name?: string };

		return bookings.map((b) => ({
			...(b.booking as unknown as Booking),
			technician_name: b.technician?.name || undefined,
		})) as BookingWithTechnician[];
	} catch (error) {
		console.error("Error in getBookingsAction:", error);
		throw new Error("Failed to get bookings");
	}
}

export async function getBookingAction(id: string) {
	try {
		const [row] = await db.select({
			booking: taasBookings,
			technician: taasTechnicians,
		})
		.from(taasBookings)
		.leftJoin(taasTechnicians, eq(taasBookings.technician_id, taasTechnicians.id))
		.where(eq(taasBookings.id, id))
		.limit(1);

		if (!row) {
			throw new Error("Booking not found");
		}

		return {
			booking: row.booking as unknown as Booking,
			technician: row.technician as unknown as Technician | null,
		};
	} catch (error) {
		console.error("Error in getBookingAction:", error);
		throw new Error("Failed to get booking");
	}
}

export async function getTechnicianBookingsAction(userId: string) {
	try {
		const [technician] = await db.select().from(taasTechnicians).where(eq(taasTechnicians.user_id, userId)).limit(1);
		if (!technician) return [];

		const bookings = await db.select({
			booking: taasBookings,
			client: taasUsers,
		})
		.from(taasBookings)
		.leftJoin(taasUsers, eq(taasBookings.client_id, taasUsers.id))
		.where(eq(taasBookings.technician_id, technician.id))
		.orderBy(desc(taasBookings.created_at));

		type BookingWithDetails = Booking & {
			client_name?: string;
			client_email?: string;
		};

		return bookings.map((b) => ({
			...(b.booking as unknown as Booking),
			client_name: b.client?.display_name || undefined,
			client_email: b.client?.email || undefined,
		})) as BookingWithDetails[];
	} catch (error) {
		console.error("Error in getTechnicianBookingsAction:", error);
		throw new Error("Failed to get technician bookings");
	}
}

export async function createBookingAction(input: {
	client_id: string;
	technician_id: string;
	service_type: string;
	problem_description: string;
	address: string;
	preferred_date_time: string;
}) {
	try {
		const newBookingVal = {
			client_id: input.client_id,
			technician_id: input.technician_id,
			service_type: input.service_type,
			problem_description: input.problem_description,
			address: input.address,
			preferred_date_time: input.preferred_date_time,
			status: "requested",
			completed_by_client: false,
			completed_by_technician: false,
			lead_contacted: false,
			lead_closed: false,
		};
		await db.insert(taasBookings).values(newBookingVal);
		return { success: true };
	} catch (error) {
		console.error("Error in createBookingAction:", error);
		throw new Error("Failed to create booking");
	}
}

export async function updateBookingAction(id: string, updates: Partial<Booking>) {
	try {
		const mappedUpdates: Record<string, any> = {
			updated_at: new Date().toISOString(),
		};

		if (updates.status !== undefined) mappedUpdates.status = updates.status;
		if (updates.negotiated_price !== undefined) mappedUpdates.negotiated_price = updates.negotiated_price;
		if (updates.negotiated_date_time !== undefined) mappedUpdates.negotiated_date_time = updates.negotiated_date_time;
		if (updates.accepted_at !== undefined) mappedUpdates.accepted_at = updates.accepted_at;
		if (updates.completed_by_client !== undefined) mappedUpdates.completed_by_client = updates.completed_by_client;
		if (updates.completed_by_technician !== undefined) mappedUpdates.completed_by_technician = updates.completed_by_technician;
		if (updates.lead_contacted !== undefined) mappedUpdates.lead_contacted = updates.lead_contacted;
		if (updates.lead_closed !== undefined) mappedUpdates.lead_closed = updates.lead_closed;

		await db.update(taasBookings).set(mappedUpdates).where(eq(taasBookings.id, id));
		return { success: true };
	} catch (error) {
		console.error("Error in updateBookingAction:", error);
		throw new Error("Failed to update booking");
	}
}

export async function getAdminBookingsAction() {
	try {
		const bookings = await db.select({
			booking: taasBookings,
			technician: taasTechnicians,
			client: taasUsers,
		})
		.from(taasBookings)
		.leftJoin(taasTechnicians, eq(taasBookings.technician_id, taasTechnicians.id))
		.leftJoin(taasUsers, eq(taasBookings.client_id, taasUsers.id))
		.orderBy(desc(taasBookings.created_at));

		type BookingWithDetails = Booking & { id: string; technician_name?: string; client_name?: string };

		return bookings.map((b) => ({
			...(b.booking as unknown as Booking),
			technician_name: b.technician?.name || undefined,
			client_name: b.client?.display_name || b.client?.email || undefined,
		})) as BookingWithDetails[];
	} catch (error) {
		console.error("Error in getAdminBookingsAction:", error);
		throw new Error("Failed to get admin bookings");
	}
}

export async function getAdminClientsAction() {
	try {
		// Clients are users who are not admin and have client role
		const clients = await db.select().from(taasUsers).orderBy(desc(taasUsers.created_at));
		return clients as unknown as User[];
	} catch (error) {
		console.error("Error in getAdminClientsAction:", error);
		throw new Error("Failed to get admin clients");
	}
}

// ─── Chat Actions ────────────────────────────────────────────────────────────

export async function getChatMessagesAction(bookingId: string) {
	try {
		const messages = await db.select()
			.from(taasChats)
			.where(eq(taasChats.booking_id, bookingId))
			.orderBy(asc(taasChats.created_at));
		return messages as unknown as ChatMessage[];
	} catch (error) {
		console.error("Error in getChatMessagesAction:", error);
		throw new Error("Failed to get chat messages");
	}
}

export async function sendChatMessageAction(input: {
	booking_id: string;
	sender_id: string;
	sender_type: "client" | "technician";
	message: string;
	offer_price?: number;
	offer_date_time?: string;
}) {
	try {
		const newVal = {
			booking_id: input.booking_id,
			sender_id: input.sender_id,
			sender_type: input.sender_type,
			message: input.message,
			offer_price: input.offer_price ? input.offer_price.toString() : null,
			offer_date_time: input.offer_date_time || null,
		};
		await db.insert(taasChats).values(newVal);
		return { success: true };
	} catch (error) {
		console.error("Error in sendChatMessageAction:", error);
		throw new Error("Failed to send message");
	}
}

// ─── Review Actions ──────────────────────────────────────────────────────────

export async function checkExistingReviewAction(bookingId: string, reviewerId: string, revieweeId: string) {
	try {
		const [review] = await db.select()
			.from(taasReviews)
			.where(and(
				eq(taasReviews.booking_id, bookingId),
				eq(taasReviews.reviewer_id, reviewerId),
				eq(taasReviews.reviewee_id, revieweeId)
			))
			.limit(1);
		return review as unknown as Review | undefined;
	} catch (error) {
		console.error("Error in checkExistingReviewAction:", error);
		throw new Error("Failed to check existing review");
	}
}

export async function submitReviewAction(input: {
	booking_id: string;
	client_id: string;
	technician_id: string;
	reviewer_id: string;
	reviewee_id: string;
	stars: number;
	text?: string;
	reviewee_type: "client" | "technician";
}) {
	const { booking_id, client_id, technician_id, reviewer_id, reviewee_id, stars, text, reviewee_type } = input;

	try {
		const [existingReview] = await db.select()
			.from(taasReviews)
			.where(and(
				eq(taasReviews.booking_id, booking_id),
				eq(taasReviews.reviewer_id, reviewer_id),
				eq(taasReviews.reviewee_id, reviewee_id)
			))
			.limit(1);

		let oldRating: number | undefined;

		if (existingReview) {
			oldRating = existingReview.stars;
			await db.update(taasReviews)
				.set({
					stars,
					text: text || "",
				})
				.where(eq(taasReviews.id, existingReview.id));
		} else {
			const newReviewVal = {
				booking_id,
				client_id,
				technician_id,
				reviewer_id,
				reviewee_id,
				stars,
				text: text || "",
			};
			await db.insert(taasReviews).values(newReviewVal);
		}

		// Update average rating and counts
		const allReviews = await db.select({ stars: taasReviews.stars })
			.from(taasReviews)
			.where(eq(taasReviews.reviewee_id, reviewee_id));

		let totalStars = 0;
		let reviewCount = allReviews.length;

		allReviews.forEach((r) => {
			totalStars += r.stars;
		});

		const ratingAvg = reviewCount > 0 ? totalStars / reviewCount : 0;
		const roundedAvg = Math.round(ratingAvg * 10) / 10;

		if (reviewee_type === "technician") {
			const [tech] = await db.select({ id: taasTechnicians.id })
				.from(taasTechnicians)
				.where(eq(taasTechnicians.user_id, reviewee_id))
				.limit(1);

			if (tech) {
				await db.update(taasTechnicians)
					.set({
						rating_avg: roundedAvg.toString(),
						rating_count: reviewCount,
					})
					.where(eq(taasTechnicians.id, tech.id));
			}
		} else {
			await db.update(taasUsers)
				.set({
					rating_avg: roundedAvg.toString(),
					rating_count: reviewCount,
				})
				.where(eq(taasUsers.id, reviewee_id));
		}

		return { success: true };
	} catch (error) {
		console.error("Error in submitReviewAction:", error);
		throw new Error("Failed to submit review");
	}
}

export async function getClientReviewsAction(clientId: string) {
	try {
		const reviews = await db.select({
			review: taasReviews,
			technician: taasTechnicians,
		})
		.from(taasReviews)
		.leftJoin(taasTechnicians, eq(taasReviews.technician_id, taasTechnicians.id))
		.where(eq(taasReviews.client_id, clientId))
		.orderBy(desc(taasReviews.created_at));

		return reviews.map((r) => ({
			...(r.review as unknown as Review),
			technician_name: r.technician?.name || undefined,
		}));
	} catch (error) {
		console.error("Error in getClientReviewsAction:", error);
		throw new Error("Failed to get client reviews");
	}
}
