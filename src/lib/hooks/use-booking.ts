import { getBookingAction } from "@/actions/client-db";
import { useQuery } from "@tanstack/react-query";

export function useBooking(id: string | undefined, options?: { refetchInterval?: number }) {
	return useQuery({
		queryKey: ["booking", id],
		queryFn: async () => {
			if (!id) throw new Error("Booking ID is required");
			return getBookingAction(id);
		},
		enabled: !!id,
		...options,
	});
}
