import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Booking, Technician } from "@/lib/types/database";
import { useQuery } from "@tanstack/react-query";

export function useBooking(id: string | undefined) {
	return useQuery({
		queryKey: ["booking", id],
		queryFn: async () => {
			if (!id) throw new Error("Booking ID is required");

			const supabase = getSupabaseBrowserClient();

			const { data: booking, error } = await supabase.from("taas_bookings").select("*").eq("id", id).single();

			if (error || !booking) {
				throw new Error("Booking not found");
			}

			// Load technician
			const { data: technician } = await supabase.from("taas_technicians").select("*").eq("id", booking.technician_id).single();

			return {
				booking: booking as Booking,
				technician: technician as Technician | null,
			};
		},
		enabled: !!id,
	});
}
