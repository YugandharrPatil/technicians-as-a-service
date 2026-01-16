'use client';

import { useState } from 'react';
import type { JobType } from '@/lib/types/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { Star, MapPin, Wrench } from 'lucide-react';
import { useTechnicians } from '@/lib/hooks/use-technicians';

type FilterState = {
  jobType: JobType | 'all';
  city: string | 'all';
  minRating: number;
  tags: string[];
};

export default function TechniciansPage() {
  const [filters, setFilters] = useState<FilterState>({
    jobType: 'all',
    city: 'all',
    minRating: 0,
    tags: [],
  });

  const { data, isLoading, error } = useTechnicians(filters);
  const technicians = data?.technicians || [];
  const availableCities = data?.availableCities || [];
  const availableTags = data?.availableTags || [];

  const toggleTag = (tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold">Technician Catalogue</h1>
        <p className="text-muted-foreground">Find the perfect technician for your needs</p>
      </div>

      <div className="mb-6 grid gap-4 rounded-lg border p-4 md:grid-cols-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Job Type</label>
          <Select
            value={filters.jobType}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, jobType: value as JobType | 'all' }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="plumber">Plumber</SelectItem>
              <SelectItem value="electrician">Electrician</SelectItem>
              <SelectItem value="carpenter">Carpenter</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="hvac">HVAC</SelectItem>
              <SelectItem value="appliance_repair">Appliance Repair</SelectItem>
              <SelectItem value="handyman">Handyman</SelectItem>
              <SelectItem value="carpentry">Carpentry</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">City</label>
          <Select
            value={filters.city}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, city: value as string | 'all' }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {availableCities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Min Rating</label>
          <Select
            value={filters.minRating.toString()}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, minRating: parseInt(value) }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any</SelectItem>
              <SelectItem value="3">3+ Stars</SelectItem>
              <SelectItem value="4">4+ Stars</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Tags</label>
          <div className="flex flex-wrap gap-2">
            {availableTags.slice(0, 5).map((tag) => (
              <div key={tag} className="flex items-center space-x-2">
                <Checkbox
                  id={tag}
                  checked={filters.tags.includes(tag)}
                  onCheckedChange={() => toggleTag(tag)}
                />
                <label
                  htmlFor={tag}
                  className="cursor-pointer text-sm"
                >
                  {tag}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center">Loading...</div>
      ) : error ? (
        <div className="text-center text-destructive">
          Error loading technicians. Please try again.
        </div>
      ) : technicians.length === 0 ? (
        <div className="text-center text-muted-foreground">
          No technicians found matching your filters.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {technicians.map((tech) => (
            <Card key={tech.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-4">
                  {tech.photoUrl ? (
                    <img
                      src={tech.photoUrl}
                      alt={tech.name}
                      className="h-16 w-16 rounded-lg object-cover border"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center border">
                      <Wrench className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="line-clamp-1">{tech.name}</CardTitle>
                    <CardDescription className="line-clamp-2 text-sm">{tech.bio}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 space-y-3">
                  {/* Job Types - Truncated */}
                  <div className="flex flex-wrap gap-1.5">
                    {tech.jobTypes.slice(0, 2).map((type) => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type.replace('_', ' ')}
                      </Badge>
                    ))}
                    {tech.jobTypes.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{tech.jobTypes.length - 2}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Primary City Only */}
                  {tech.cities.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{tech.cities[0]}</span>
                      {tech.cities.length > 1 && (
                        <span className="text-muted-foreground/70">
                          +{tech.cities.length - 1} more
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Rating - Compact */}
                  {tech.ratingAvg ? (
                    <div className="flex items-center gap-1.5">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-semibold">{tech.ratingAvg.toFixed(1)}</span>
                      {tech.ratingCount && (
                        <span className="text-xs text-muted-foreground">
                          ({tech.ratingCount})
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No ratings yet</div>
                  )}
                </div>
                <Link href={`/technicians/${tech.id}`}>
                  <Button className="w-full" variant="outline">
                    View Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
