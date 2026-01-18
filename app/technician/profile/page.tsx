'use client';

import { useState, useEffect } from 'react';
import { TechnicianGate } from '@/components/auth/technician-gate';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { getIdToken } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
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
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelect } from '@/components/ui/multi-select';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/client';
import { db } from '@/lib/firebase/client';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';

// Popular US cities for serviceable areas
const POPULAR_US_CITIES = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
  'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
  'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis',
  'Seattle', 'Denver', 'Washington', 'Boston', 'El Paso', 'Nashville',
  'Detroit', 'Oklahoma City', 'Portland', 'Las Vegas', 'Memphis', 'Louisville',
  'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Sacramento',
  'Kansas City', 'Mesa', 'Atlanta', 'Omaha', 'Colorado Springs', 'Raleigh',
  'Miami', 'Virginia Beach', 'Oakland', 'Minneapolis', 'Tulsa', 'Cleveland',
  'Wichita', 'Arlington', 'Tampa', 'New Orleans'
].sort();

// Common tags for technicians
const COMMON_TAGS = [
  'licensed', 'insured', 'emergency', '24/7', 'residential', 'commercial',
  'wiring', 'plumbing', 'hvac', 'repairs', 'installation', 'maintenance',
  'energy-efficient', 'eco-friendly', 'same-day', 'warranty', 'experienced',
  'certified', 'background-checked', 'free-estimate', 'senior-discount'
].sort();

const technicianSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  jobTypes: z.array(z.enum(['plumber', 'electrician', 'carpenter', 'maintenance', 'hvac', 'appliance_repair', 'handyman', 'carpentry'])).min(1, 'Select at least one job type'),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
  tags: z.array(z.string()).min(1, 'Select at least one tag'),
  cities: z.array(z.string()).min(1, 'Select at least one city'),
  isVisible: z.boolean(),
  photoUrl: z.string().optional(),
});

type TechnicianFormValues = z.infer<typeof technicianSchema>;

export default function TechnicianProfilePage() {
  return (
    <TechnicianGate>
      <TechnicianProfileContent />
    </TechnicianGate>
  );
}

function TechnicianProfileContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEdit, setIsEdit] = useState(false);

  const form = useForm<TechnicianFormValues>({
    resolver: zodResolver(technicianSchema),
    defaultValues: {
      name: '',
      jobTypes: [],
      bio: '',
      tags: [],
      cities: [],
      isVisible: true,
      photoUrl: undefined,
    },
  });

  // Load existing technician profile
  useEffect(() => {
    async function loadTechnicianProfile() {
      if (!user || !db) return;

      try {
        const techniciansQuery = query(
          collection(db, 'technicians'),
          where('userId', '==', user.uid)
        );
        const techniciansSnapshot = await getDocs(techniciansQuery);

        if (!techniciansSnapshot.empty) {
          const technicianDoc = techniciansSnapshot.docs[0];
          const technicianData = technicianDoc.data();
          setIsEdit(true);
          form.reset({
            name: technicianData.name || '',
            jobTypes: technicianData.jobTypes || [],
            bio: technicianData.bio || '',
            tags: technicianData.tags || [],
            cities: technicianData.cities || [],
            isVisible: technicianData.isVisible ?? true,
            photoUrl: technicianData.photoUrl || undefined,
          });
          if (technicianData.photoUrl) {
            setPhotoPreview(technicianData.photoUrl);
          }
        }
      } catch (error) {
        console.error('Error loading technician profile:', error);
      } finally {
        setLoading(false);
      }
    }

    loadTechnicianProfile();
  }, [user, form]);

  async function uploadPhoto(file: File): Promise<string> {
    if (!storage) {
      throw new Error('Storage not initialized');
    }

    if (!user) {
      throw new Error('You must be authenticated to upload photos');
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Sanitize filename
    const sanitizeFilename = (name: string): string => {
      const ext = name.split('.').pop() || '';
      const baseName = name.substring(0, name.lastIndexOf('.')) || name;
      const sanitized = baseName
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .toLowerCase();
      return `${sanitized}.${ext}`;
    };

    const timestamp = Date.now();
    const sanitizedName = sanitizeFilename(file.name);
    const filename = `technicians/${timestamp}_${sanitizedName}`;
    const storageRef = ref(storage, filename);

    try {
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Firebase Storage upload error:', error);
      throw new Error('Failed to upload photo. Please check your Firebase Storage configuration.');
    }
  }

  async function onSubmit(data: TechnicianFormValues) {
    if (!user) return;

    setSubmitting(true);
    try {
      let photoUrl = data.photoUrl;

      // Upload photo if file is selected
      if (photoFile && storage) {
        setUploadingPhoto(true);
        try {
          photoUrl = await uploadPhoto(photoFile);
        } catch (error) {
          console.error('Error uploading photo:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to upload photo');
          setUploadingPhoto(false);
          setSubmitting(false);
          return;
        } finally {
          setUploadingPhoto(false);
        }
      }

      // Get ID token for authentication
      if (!auth || !auth.currentUser) {
        toast.error('You must be logged in to save your profile');
        setSubmitting(false);
        return;
      }

      const idToken = await getIdToken(auth.currentUser);
      const endpoint = '/api/technician/profile';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          ...data,
          photoUrl,
        }),
      });

      if (response.ok) {
        toast.success(isEdit ? 'Profile updated successfully!' : 'Profile created successfully!');
        router.push('/technician/dashboard');
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to ${isEdit ? 'update' : 'create'} profile`);
      }
    } catch (error) {
      console.error(`Error ${isEdit ? 'updating' : 'creating'} technician profile:`, error);
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} profile`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-2xl p-4">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Profile' : 'Complete Your Profile'}</CardTitle>
          <CardDescription>
            {isEdit 
              ? 'Update your technician profile information'
              : 'Fill in your details to start receiving booking requests'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jobTypes"
                render={() => (
                  <FormItem>
                    <FormLabel>Job Types</FormLabel>
                    <div className="space-y-2">
                      {(['plumber', 'electrician', 'carpenter', 'maintenance', 'hvac', 'appliance_repair', 'handyman', 'carpentry'] as const).map((type) => (
                        <FormField
                          key={type}
                          control={form.control}
                          name="jobTypes"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(type)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    field.onChange(
                                      checked
                                        ? [...current, type]
                                        : current.filter((t) => t !== type)
                                    );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal capitalize">{type}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={COMMON_TAGS}
                        selected={field.value || []}
                        onChange={field.onChange}
                        placeholder="Select tags..."
                      />
                    </FormControl>
                    <FormDescription>
                      Select relevant tags for your profile
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serviceable Cities</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={POPULAR_US_CITIES}
                        selected={field.value || []}
                        onChange={field.onChange}
                        placeholder="Select cities..."
                      />
                    </FormControl>
                    <FormDescription>
                      Select cities where you provide services
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="photoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Photo (Optional)</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {photoPreview ? (
                          <div className="relative inline-block">
                            <img
                              src={photoPreview}
                              alt="Preview"
                              className="h-32 w-32 rounded-lg object-cover border"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setPhotoFile(null);
                                setPhotoPreview(null);
                                field.onChange(undefined);
                              }}
                              className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-1 hover:bg-destructive/90"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 5 * 1024 * 1024) {
                                    toast.error('File size must be less than 5MB');
                                    return;
                                  }
                                  setPhotoFile(file);
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setPhotoPreview(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="cursor-pointer"
                            />
                          </div>
                        )}
                        {uploadingPhoto && (
                          <p className="text-sm text-muted-foreground">Uploading photo...</p>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Upload a photo (max 5MB). JPG, PNG, or WebP formats.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isVisible"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">Visible to clients</FormLabel>
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={submitting || uploadingPhoto}>
                  {submitting || uploadingPhoto 
                    ? (isEdit ? 'Updating...' : 'Creating...') 
                    : (isEdit ? 'Update Profile' : 'Create Profile')}
                </Button>
                {isEdit && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => router.push('/technician/dashboard')}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
