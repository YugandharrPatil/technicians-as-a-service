import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, numeric, index, foreignKey } from "drizzle-orm/sqlite-core";

export const taasUsers = sqliteTable("taas_users", {
	id: text("id").primaryKey().notNull(),
	email: text("email").notNull(),
	display_name: text("display_name").default(""),
	role: text("role").default("client"),
	roles: text("roles", { mode: "json" }).$type<string[]>().default(sql`'["client"]'`),
	rating_avg: numeric("rating_avg").default("0"),
	rating_count: integer("rating_count").default(0),
	created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const taasTechnicians = sqliteTable(
	"taas_technicians",
	{
		id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
		user_id: text("user_id"),
		name: text("name").notNull(),
		job_types: text("job_types", { mode: "json" }).$type<string[]>().notNull(),
		bio: text("bio").notNull(),
		tags: text("tags", { mode: "json" }).$type<string[]>().default(sql`'[]'`),
		cities: text("cities", { mode: "json" }).$type<string[]>().default(sql`'[]'`),
		rating_avg: numeric("rating_avg").default("0"),
		rating_count: integer("rating_count").default(0),
		is_visible: integer("is_visible", { mode: "boolean" }).default(true),
		photo_url: text("photo_url"),
		embedding: text("embedding", { mode: "json" }),
		created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
		updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
	},
	(table) => [
		index("idx_technicians_is_visible").on(table.is_visible),
		index("idx_technicians_user_id").on(table.user_id),
		foreignKey({
			columns: [table.user_id],
			foreignColumns: [taasUsers.id],
			name: "taas_technicians_user_id_taas_users_id_fk",
		}),
	]
);

export const taasBookings = sqliteTable(
	"taas_bookings",
	{
		id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
		client_id: text("client_id").notNull(),
		technician_id: text("technician_id").notNull(),
		service_type: text("service_type").notNull(),
		problem_description: text("problem_description").notNull(),
		address: text("address").notNull(),
		preferred_date_time: text("preferred_date_time").notNull(),
		status: text("status").default("requested"),
		negotiated_price: numeric("negotiated_price"),
		negotiated_date_time: text("negotiated_date_time"),
		accepted_at: text("accepted_at"),
		completed_by_client: integer("completed_by_client", { mode: "boolean" }).default(false),
		completed_by_technician: integer("completed_by_technician", { mode: "boolean" }).default(false),
		lead_contacted: integer("lead_contacted", { mode: "boolean" }).default(false),
		lead_closed: integer("lead_closed", { mode: "boolean" }).default(false),
		created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
		updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
	},
	(table) => [
		index("idx_bookings_client_id").on(table.client_id),
		index("idx_bookings_status").on(table.status),
		index("idx_bookings_technician_id").on(table.technician_id),
		foreignKey({
			columns: [table.client_id],
			foreignColumns: [taasUsers.id],
			name: "taas_bookings_client_id_taas_users_id_fk",
		}),
		foreignKey({
			columns: [table.technician_id],
			foreignColumns: [taasTechnicians.id],
			name: "taas_bookings_technician_id_taas_technicians_id_fk",
		}),
	]
);

export const taasChats = sqliteTable(
	"taas_chats",
	{
		id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
		booking_id: text("booking_id").notNull(),
		sender_id: text("sender_id").notNull(),
		sender_type: text("sender_type").notNull(),
		message: text("message").notNull(),
		offer_price: numeric("offer_price"),
		offer_date_time: text("offer_date_time"),
		created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
	},
	(table) => [
		index("idx_chat_messages_booking_id").on(table.booking_id),
		foreignKey({
			columns: [table.booking_id],
			foreignColumns: [taasBookings.id],
			name: "taas_chats_booking_id_taas_bookings_id_fk",
		}),
	]
);

export const taasReviews = sqliteTable(
	"taas_reviews",
	{
		id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
		booking_id: text("booking_id").notNull(),
		client_id: text("client_id").notNull(),
		technician_id: text("technician_id").notNull(),
		reviewer_id: text("reviewer_id").notNull(),
		reviewee_id: text("reviewee_id").notNull(),
		stars: integer("stars").notNull(),
		text: text("text").default(""),
		created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
	},
	(table) => [
		index("idx_reviews_booking_id").on(table.booking_id),
		index("idx_reviews_reviewee_id").on(table.reviewee_id),
		index("idx_reviews_reviewer_id").on(table.reviewer_id),
		foreignKey({
			columns: [table.booking_id],
			foreignColumns: [taasBookings.id],
			name: "taas_reviews_booking_id_taas_bookings_id_fk",
		}),
		foreignKey({
			columns: [table.technician_id],
			foreignColumns: [taasTechnicians.id],
			name: "taas_reviews_technician_id_taas_technicians_id_fk",
		}),
	]
);
