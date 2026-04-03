import { relations } from "drizzle-orm/relations";
import { taasUsers, taasBookings, taasTechnicians, taasChats, taasReviews } from "./schema";

export const taasBookingsRelations = relations(taasBookings, ({one, many}) => ({
	taasUser: one(taasUsers, {
		fields: [taasBookings.clientId],
		references: [taasUsers.id]
	}),
	taasTechnician: one(taasTechnicians, {
		fields: [taasBookings.technicianId],
		references: [taasTechnicians.id]
	}),
	taasChats: many(taasChats),
	taasReviews: many(taasReviews),
}));

export const taasUsersRelations = relations(taasUsers, ({many}) => ({
	taasBookings: many(taasBookings),
	taasTechnicians: many(taasTechnicians),
}));

export const taasTechniciansRelations = relations(taasTechnicians, ({one, many}) => ({
	taasBookings: many(taasBookings),
	taasUser: one(taasUsers, {
		fields: [taasTechnicians.userId],
		references: [taasUsers.id]
	}),
	taasReviews: many(taasReviews),
}));

export const taasChatsRelations = relations(taasChats, ({one}) => ({
	taasBooking: one(taasBookings, {
		fields: [taasChats.bookingId],
		references: [taasBookings.id]
	}),
}));

export const taasReviewsRelations = relations(taasReviews, ({one}) => ({
	taasBooking: one(taasBookings, {
		fields: [taasReviews.bookingId],
		references: [taasBookings.id]
	}),
	taasTechnician: one(taasTechnicians, {
		fields: [taasReviews.technicianId],
		references: [taasTechnicians.id]
	}),
}));