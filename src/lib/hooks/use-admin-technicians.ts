import { getAdminTechnician, getAdminTechnicians } from "@/actions/admin";
import { useQuery } from "@tanstack/react-query";

export function useAdminTechnicians() {
	return useQuery({
		queryKey: ["admin-technicians"],
		queryFn: () => getAdminTechnicians(),
	});
}

export function useAdminTechnician(id: string) {
	return useQuery({
		queryKey: ["admin-technician", id],
		queryFn: () => getAdminTechnician(id),
		enabled: !!id,
	});
}
