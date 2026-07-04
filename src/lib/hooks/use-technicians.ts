import { getTechniciansAction } from "@/actions/client-db";
import type { JobType } from "@/lib/types/database";
import { useQuery } from "@tanstack/react-query";

type FilterState = {
	jobType: JobType | "all";
	city: string | "all";
	minRating: number;
	tags: string[];
};

export function useTechnicians(filters: FilterState) {
	return useQuery({
		queryKey: ["technicians", filters],
		queryFn: async () => {
			return getTechniciansAction(filters);
		},
	});
}
