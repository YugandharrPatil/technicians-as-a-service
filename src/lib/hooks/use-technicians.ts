import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { JobType, Technician } from "@/lib/types/database";
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
			const supabase = getSupabaseBrowserClient();

			const { data, error } = await supabase.from("taas_technicians").select("*").eq("is_visible", true);

			if (error) {
				console.error("Error fetching technicians:", error);
				return { technicians: [], availableCities: [], availableTags: [] };
			}

			const techs = (data || []) as Technician[];
			const citiesSet = new Set<string>();
			const tagsSet = new Set<string>();

			techs.forEach((t) => {
				t.cities.forEach((c) => citiesSet.add(c));
				t.tags.forEach((tag) => tagsSet.add(tag));
			});

			// Sort by rating
			techs.sort((a, b) => {
				const ratingA = a.rating_avg || 0;
				const ratingB = b.rating_avg || 0;
				return ratingB - ratingA;
			});

			// Apply filters
			let filtered = techs;
			if (filters.jobType !== "all") {
				const jobType = filters.jobType as JobType;
				filtered = filtered.filter((t) => t.job_types.includes(jobType));
			}
			if (filters.city !== "all") {
				const city = filters.city as string;
				filtered = filtered.filter((t) => t.cities.includes(city));
			}
			if (filters.minRating > 0) {
				filtered = filtered.filter((t) => (t.rating_avg || 0) >= filters.minRating);
			}
			if (filters.tags.length > 0) {
				filtered = filtered.filter((t) => filters.tags.some((tag) => t.tags.includes(tag)));
			}

			return {
				technicians: filtered,
				availableCities: Array.from(citiesSet).sort(),
				availableTags: Array.from(tagsSet).sort(),
			};
		},
	});
}
