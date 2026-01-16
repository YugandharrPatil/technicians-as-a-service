'use client';

import { use } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Star, MapPin, ArrowLeft, Calendar, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTechnician } from '@/lib/hooks/use-technician';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function TechnicianProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: technician, isLoading, error } = useTechnician(id);
  const { user } = useAuth();
  const router = useRouter();

  const handleBook = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    router.push(`/booking/create?technicianId=${id}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (error || !technician) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center text-destructive">Technician not found</div>
      </div>
    );
  }

  const formatDate = (date: Date | string | { toDate?: () => Date } | undefined) => {
    if (!date) return 'N/A';
    let d: Date | null = null;
    if (date instanceof Date) {
      d = date;
    } else if (typeof date === 'string') {
      d = new Date(date);
    } else if (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
      d = date.toDate();
    }
    if (!d || isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="container mx-auto max-w-6xl p-4">
      <Link href="/technicians" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Catalogue
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                {technician.photoUrl ? (
                  <img
                    src={technician.photoUrl}
                    alt={technician.name}
                    className="h-20 w-20 rounded-lg object-cover border"
                  />
                ) : (
                  <Avatar className="h-20 w-20">
                    <AvatarFallback>{technician.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-2">{technician.name}</CardTitle>
                  <CardDescription className="text-base">{technician.bio}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Separator />

              {/* Service Types */}
              <div>
                <h3 className="mb-3 text-lg font-semibold">Service Types</h3>
                <div className="flex flex-wrap gap-2">
                  {technician.jobTypes.map((type) => (
                    <Badge key={type} variant="secondary" className="text-sm py-1 px-3">
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Serviceable Areas */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <MapPin className="h-5 w-5" />
                  Serviceable Areas
                </h3>
                <div className="flex flex-wrap gap-2">
                  {technician.cities.map((city) => (
                    <Badge key={city} variant="outline" className="text-sm">
                      {city}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Specializations/Tags */}
              {technician.tags.length > 0 && (
                <>
                  <div>
                    <h3 className="mb-3 text-lg font-semibold">Specializations & Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {technician.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-sm">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Rating */}
              {technician.ratingAvg ? (
                <>
                  <div>
                    <h3 className="mb-3 text-lg font-semibold">Rating & Reviews</h3>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                        <span className="text-2xl font-bold">{technician.ratingAvg.toFixed(1)}</span>
                      </div>
                      {technician.ratingCount && (
                        <span className="text-muted-foreground">
                          Based on {technician.ratingCount} {technician.ratingCount === 1 ? 'review' : 'reviews'}
                        </span>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              ) : (
                <>
                  <div>
                    <h3 className="mb-3 text-lg font-semibold">Rating & Reviews</h3>
                    <p className="text-muted-foreground">No ratings yet</p>
                  </div>
                  <Separator />
                </>
              )}

              {/* Visibility Status */}
              <div>
                <h3 className="mb-3 text-lg font-semibold">Availability</h3>
                <div className="flex items-center gap-2">
                  {technician.isVisible ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-green-600 font-medium">Available for bookings</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-gray-400" />
                      <span className="text-muted-foreground">Currently unavailable</span>
                    </>
                  )}
                </div>
              </div>

              {/* Metadata */}
              {(technician.createdAt || technician.updatedAt) && (
                <>
                  <Separator />
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {technician.createdAt && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Member since {formatDate(technician.createdAt)}</span>
                      </div>
                    )}
                    {technician.updatedAt && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Profile updated {formatDate(technician.updatedAt)}</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Embedding Info (for admin/debugging) */}
              {technician.embedding && (
                <>
                  <Separator />
                  <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                    <p className="font-semibold mb-1">AI Integration:</p>
                    <p>Embedding provider: {technician.embedding.provider}</p>
                    <p>Model: {technician.embedding.model}</p>
                    {technician.embedding.updatedAt && (
                      <p>Last synced: {formatDate(technician.embedding.updatedAt)}</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Booking Card */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Book This Technician</CardTitle>
              <CardDescription>
                Schedule a service appointment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {technician.ratingAvg && (
                <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <div>
                    <div className="font-semibold">{technician.ratingAvg.toFixed(1)} Rating</div>
                    {technician.ratingCount && (
                      <div className="text-xs text-muted-foreground">
                        {technician.ratingCount} {technician.ratingCount === 1 ? 'review' : 'reviews'}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <Button onClick={handleBook} className="w-full" size="lg">
                Book Now
              </Button>
              <div className="text-xs text-center text-muted-foreground">
                {technician.cities.length > 0 && (
                  <p>Serves: {technician.cities.slice(0, 2).join(', ')}
                    {technician.cities.length > 2 && ` +${technician.cities.length - 2} more`}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
