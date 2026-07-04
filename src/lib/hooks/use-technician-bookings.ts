import { getTechnicianBookingsAction } from "@/actions/client-db";
import { useQuery } from "@tanstack/react-query";

export function useTechnicianBookings(userId: string | undefined) {
	return useQuery({
		queryKey: ["technician-bookings", userId],
		queryFn: async () => {
			if (!userId) return [];
			return getTechnicianBookingsAction(userId);
		},
		enabled: !!userId,
		refetchOnWindowFocus: false,
		refetchOnMount: true,
		refetchOnReconnect: false,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
	});
}
