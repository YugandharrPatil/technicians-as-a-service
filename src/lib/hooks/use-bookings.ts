import { getBookingsAction } from "@/actions/client-db";
import { useQuery } from "@tanstack/react-query";

export function useBookings(clientId: string | undefined) {
	return useQuery({
		queryKey: ["bookings", clientId],
		queryFn: async () => {
			if (!clientId) return [];
			return getBookingsAction(clientId);
		},
		enabled: !!clientId,
	});
}
