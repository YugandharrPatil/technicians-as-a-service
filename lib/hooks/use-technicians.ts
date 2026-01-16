import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Technician, JobType } from '@/lib/types/firestore';

type FilterState = {
  jobType: JobType | 'all';
  city: string | 'all';
  minRating: number;
  tags: string[];
};

export function useTechnicians(filters: FilterState) {
  return useQuery({
    queryKey: ['technicians', filters],
    queryFn: async () => {
      if (!db) return { technicians: [], availableCities: [], availableTags: [] };
      let q = query(
        collection(db, 'technicians'),
        where('isVisible', '==', true)
      );

      const snapshot = await getDocs(q);
      const techs: (Technician & { id: string })[] = [];
      const citiesSet = new Set<string>();
      const tagsSet = new Set<string>();

      snapshot.forEach((doc) => {
        const data = doc.data() as Technician;
        techs.push({ ...data, id: doc.id });
        data.cities.forEach((c) => citiesSet.add(c));
        data.tags.forEach((t) => tagsSet.add(t));
      });

      // Sort by rating (handle missing ratings)
      techs.sort((a, b) => {
        const ratingA = a.ratingAvg || 0;
        const ratingB = b.ratingAvg || 0;
        return ratingB - ratingA;
      });

      // Apply filters
      let filtered = techs;
      if (filters.jobType !== 'all') {
        const jobType = filters.jobType as JobType;
        filtered = filtered.filter((t) => t.jobTypes.includes(jobType));
      }
      if (filters.city !== 'all') {
        const city = filters.city as string;
        filtered = filtered.filter((t) => t.cities.includes(city));
      }
      if (filters.minRating > 0) {
        filtered = filtered.filter((t) => (t.ratingAvg || 0) >= filters.minRating);
      }
      if (filters.tags.length > 0) {
        filtered = filtered.filter((t) =>
          filters.tags.some((tag) => t.tags.includes(tag))
        );
      }

      return {
        technicians: filtered,
        availableCities: Array.from(citiesSet).sort(),
        availableTags: Array.from(tagsSet).sort(),
      };
    },
  });
}
