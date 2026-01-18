'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/lib/auth/context';
import type { Technician } from '@/lib/types/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimePicker } from '@/components/ui/time-picker';

const bookingSchema = z.object({
  serviceType: z.string().min(1, 'Service type is required'),
  problemDescription: z.string().min(10, 'Please provide a detailed description'),
  address: z.string().min(5, 'Address is required'),
  preferredDate: z.date({
    message: 'Date is required',
  }),
  preferredTime: z.string().min(1, 'Time is required'),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

function CreateBookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const technicianId = searchParams.get('technicianId');
  const { user } = useAuth();
  const [technician, setTechnician] = useState<(Technician & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      serviceType: '',
      problemDescription: '',
      address: '',
      preferredDate: undefined,
      preferredTime: '',
    },
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (technicianId) {
      loadTechnician();
    }
  }, [technicianId, user]);

  async function loadTechnician() {
    if (!technicianId) return;

    if (!db) return;
    try {
      const docRef = doc(db, 'technicians', technicianId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const tech = { ...docSnap.data() as Technician, id: docSnap.id };
        setTechnician(tech);
        // Pre-fill service type if technician has only one job type
        if (tech.jobTypes.length === 1) {
          form.setValue('serviceType', tech.jobTypes[0]);
        }
      }
    } catch (error) {
      console.error('Error loading technician:', error);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(data: BookingFormValues) {
    if (!user || !technicianId) return;

    setSubmitting(true);
    try {
      if (!db) return;
      // Format date as YYYY-MM-DD for combining with time
      const dateStr = format(data.preferredDate, 'yyyy-MM-dd');
      const preferredDateTime = new Date(`${dateStr}T${data.preferredTime}`);

      await addDoc(collection(db, 'bookings'), {
        clientId: user.uid,
        technicianId,
        serviceType: data.serviceType,
        problemDescription: data.problemDescription,
        address: data.address,
        preferredDateTime,
        status: 'requested',
        lead: {
          contacted: false,
          closed: false,
        },
        createdAt: new Date(),
      });

      router.push('/account/bookings');
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return null;
  }

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>Create Booking</CardTitle>
          <CardDescription>
            {technician && (
              <>
                Booking with <strong>{technician.name}</strong>
                <div className="mt-2 flex flex-wrap gap-2">
                  {technician.jobTypes.map((type) => (
                    <Badge key={type} variant="secondary">
                      {type}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Plumbing repair" />
                    </FormControl>
                    <FormDescription>
                      The type of service you need
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="problemDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Problem Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe your problem in detail..."
                        rows={5}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123 Main St, City, State" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="preferredDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Preferred Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferredTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Preferred Time</FormLabel>
                      <FormControl>
                        <TimePicker
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Creating Booking...' : 'Create Booking'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CreateBookingPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-4">Loading...</div>}>
      <CreateBookingContent />
    </Suspense>
  );
}
