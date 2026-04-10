import { sql } from "drizzle-orm";
import { boolean, foreignKey, index, integer, jsonb, numeric, pgEnum, pgSequence, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const propertyStatus = pgEnum("property_status", ["available", "sold", "pending"]);
export const propertyType = pgEnum("property_type", ["house", "apartment", "condo", "townhouse", "land", "commercial"]);
export const senderRole = pgEnum("sender_role", ["user", "admin"]);
export const visitStatus = pgEnum("visit_status", ["pending", "confirmed", "cancelled"]);

export const petMessagesIdSeq = pgSequence("pet_messages_id_seq", { startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false });
export const agencyProjectsIdSeq = pgSequence("agency_projects_id_seq", { startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false });
export const agencyMessagesIdSeq = pgSequence("agency_messages_id_seq", { startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false });

export const taasUsers = pgTable("taas_users", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	displayName: text("display_name").default(""),
	role: text().default("client"),
	roles: text().array().default(["RAY['client'::tex"]),
	ratingAvg: numeric("rating_avg", { precision: 3, scale: 1 }).default("0"),
	ratingCount: integer("rating_count").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
});

export const taasBookings = pgTable(
	"taas_bookings",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		clientId: text("client_id").notNull(),
		technicianId: uuid("technician_id").notNull(),
		serviceType: text("service_type").notNull(),
		problemDescription: text("problem_description").notNull(),
		address: text().notNull(),
		preferredDateTime: timestamp("preferred_date_time", { withTimezone: true, mode: "string" }).notNull(),
		status: text().default("requested"),
		negotiatedPrice: numeric("negotiated_price", { precision: 10, scale: 2 }),
		negotiatedDateTime: timestamp("negotiated_date_time", { withTimezone: true, mode: "string" }),
		acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "string" }),
		completedByClient: boolean("completed_by_client").default(false),
		completedByTechnician: boolean("completed_by_technician").default(false),
		leadContacted: boolean("lead_contacted").default(false),
		leadClosed: boolean("lead_closed").default(false),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
	},
	(table) => [
		index("idx_bookings_client_id").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
		index("idx_bookings_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
		index("idx_bookings_technician_id").using("btree", table.technicianId.asc().nullsLast().op("uuid_ops")),
		foreignKey({
			columns: [table.clientId],
			foreignColumns: [taasUsers.id],
			name: "taas_bookings_client_id_taas_users_id_fk",
		}),
		foreignKey({
			columns: [table.technicianId],
			foreignColumns: [taasTechnicians.id],
			name: "taas_bookings_technician_id_taas_technicians_id_fk",
		}),
	],
);

export const taasTechnicians = pgTable(
	"taas_technicians",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		userId: text("user_id"),
		name: text().notNull(),
		jobTypes: text("job_types").array().notNull(),
		bio: text().notNull(),
		tags: text().array().default([""]),
		cities: text().array().default([""]),
		ratingAvg: numeric("rating_avg", { precision: 3, scale: 1 }).default("0"),
		ratingCount: integer("rating_count").default(0),
		isVisible: boolean("is_visible").default(true),
		photoUrl: text("photo_url"),
		embedding: jsonb(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
	},
	(table) => [
		index("idx_technicians_is_visible").using("btree", table.isVisible.asc().nullsLast().op("bool_ops")),
		index("idx_technicians_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [taasUsers.id],
			name: "taas_technicians_user_id_taas_users_id_fk",
		}),
	],
);

export const taasChats = pgTable(
	"taas_chats",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		bookingId: uuid("booking_id").notNull(),
		senderId: text("sender_id").notNull(),
		senderType: text("sender_type").notNull(),
		message: text().notNull(),
		offerPrice: numeric("offer_price", { precision: 10, scale: 2 }),
		offerDateTime: timestamp("offer_date_time", { withTimezone: true, mode: "string" }),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
	},
	(table) => [
		index("idx_chat_messages_booking_id").using("btree", table.bookingId.asc().nullsLast().op("uuid_ops")),
		foreignKey({
			columns: [table.bookingId],
			foreignColumns: [taasBookings.id],
			name: "taas_chats_booking_id_taas_bookings_id_fk",
		}),
	],
);

export const taasReviews = pgTable(
	"taas_reviews",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		bookingId: uuid("booking_id").notNull(),
		clientId: text("client_id").notNull(),
		technicianId: uuid("technician_id").notNull(),
		reviewerId: text("reviewer_id").notNull(),
		revieweeId: text("reviewee_id").notNull(),
		stars: integer().notNull(),
		text: text().default(""),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
	},
	(table) => [
		index("idx_reviews_booking_id").using("btree", table.bookingId.asc().nullsLast().op("uuid_ops")),
		index("idx_reviews_reviewee_id").using("btree", table.revieweeId.asc().nullsLast().op("text_ops")),
		index("idx_reviews_reviewer_id").using("btree", table.reviewerId.asc().nullsLast().op("text_ops")),
		foreignKey({
			columns: [table.bookingId],
			foreignColumns: [taasBookings.id],
			name: "taas_reviews_booking_id_taas_bookings_id_fk",
		}),
		foreignKey({
			columns: [table.technicianId],
			foreignColumns: [taasTechnicians.id],
			name: "taas_reviews_technician_id_taas_technicians_id_fk",
		}),
	],
);
