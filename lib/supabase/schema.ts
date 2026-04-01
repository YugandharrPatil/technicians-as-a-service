import {
	pgTable,
	text,
	uuid,
	boolean,
	integer,
	decimal,
	timestamp,
	jsonb,
	index,
	check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Users ──────────────────────────────────────────────────────────
export const users = pgTable("taas_users", {
	id: text("id").primaryKey(), // Clerk user ID
	email: text("email").notNull(),
	display_name: text("display_name").default(""),
	role: text("role").default("client"), // current active role
	roles: text("roles").array().default(sql`ARRAY['client']::TEXT[]`),
	rating_avg: decimal("rating_avg", { precision: 3, scale: 1 }).default("0"),
	rating_count: integer("rating_count").default(0),
	created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Technicians ────────────────────────────────────────────────────
export const technicians = pgTable(
	"taas_technicians",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		user_id: text("user_id").references(() => users.id),
		name: text("name").notNull(),
		job_types: text("job_types").array().notNull(),
		bio: text("bio").notNull(),
		tags: text("tags").array().default(sql`'{}'`),
		cities: text("cities").array().default(sql`'{}'`),
		rating_avg: decimal("rating_avg", { precision: 3, scale: 1 }).default("0"),
		rating_count: integer("rating_count").default(0),
		is_visible: boolean("is_visible").default(true),
		photo_url: text("photo_url"),
		embedding: jsonb("embedding"),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
		updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(table) => [
		index("idx_technicians_user_id").on(table.user_id),
		index("idx_technicians_is_visible").on(table.is_visible),
	]
);

// ─── Bookings ───────────────────────────────────────────────────────
export const bookings = pgTable(
	"taas_bookings",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		client_id: text("client_id")
			.notNull()
			.references(() => users.id),
		technician_id: uuid("technician_id")
			.notNull()
			.references(() => technicians.id),
		service_type: text("service_type").notNull(),
		problem_description: text("problem_description").notNull(),
		address: text("address").notNull(),
		preferred_date_time: timestamp("preferred_date_time", {
			withTimezone: true,
		}).notNull(),
		status: text("status").default("requested"),
		negotiated_price: decimal("negotiated_price", {
			precision: 10,
			scale: 2,
		}),
		negotiated_date_time: timestamp("negotiated_date_time", {
			withTimezone: true,
		}),
		accepted_at: timestamp("accepted_at", { withTimezone: true }),
		completed_by_client: boolean("completed_by_client").default(false),
		completed_by_technician: boolean("completed_by_technician").default(false),
		lead_contacted: boolean("lead_contacted").default(false),
		lead_closed: boolean("lead_closed").default(false),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
		updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(table) => [
		index("idx_bookings_client_id").on(table.client_id),
		index("idx_bookings_technician_id").on(table.technician_id),
		index("idx_bookings_status").on(table.status),
	]
);

// ─── Reviews ────────────────────────────────────────────────────────
export const reviews = pgTable(
	"taas_reviews",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		booking_id: uuid("booking_id")
			.notNull()
			.references(() => bookings.id),
		client_id: text("client_id").notNull(),
		technician_id: uuid("technician_id")
			.notNull()
			.references(() => technicians.id),
		reviewer_id: text("reviewer_id").notNull(),
		reviewee_id: text("reviewee_id").notNull(),
		stars: integer("stars").notNull(),
		text: text("text").default(""),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
	},
	(table) => [
		check("stars_range", sql`${table.stars} >= 1 AND ${table.stars} <= 5`),
		index("idx_reviews_booking_id").on(table.booking_id),
		index("idx_reviews_reviewer_id").on(table.reviewer_id),
		index("idx_reviews_reviewee_id").on(table.reviewee_id),
	]
);

// ─── Chat Messages ──────────────────────────────────────────────────
export const chatMessages = pgTable(
	"taas_chats",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		booking_id: uuid("booking_id")
			.notNull()
			.references(() => bookings.id),
		sender_id: text("sender_id").notNull(),
		sender_type: text("sender_type").notNull(), // 'client' | 'technician'
		message: text("message").notNull(),
		offer_price: decimal("offer_price", { precision: 10, scale: 2 }),
		offer_date_time: timestamp("offer_date_time", { withTimezone: true }),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
	},
	(table) => [
		check(
			"sender_type_check",
			sql`${table.sender_type} IN ('client', 'technician')`
		),
		index("idx_chat_messages_booking_id").on(table.booking_id),
	]
);
