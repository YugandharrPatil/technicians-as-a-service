import { getTechnicianAction } from "@/actions/client-db";
import { useQuery } from "@tanstack/react-query";

export function useTechnician(id: string) {
	return useQuery({
		queryKey: ["technician", id],
		queryFn: async () => {
			if (!id) throw new Error("Technician ID is required");
			const tech = await getTechnicianAction(id);
			if (!tech) throw new Error("Technician not found");
			return tech;
		},
		enabled: !!id,
	});
}
