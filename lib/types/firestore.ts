import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'client';

export type User = {
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Timestamp | Date;
};

export type JobType = 'plumber' | 'electrician' | 'carpenter' | 'maintenance' | 'hvac' | 'appliance_repair' | 'handyman' | 'carpentry';

export type Technician = {
  name: string;
  jobTypes: JobType[];
  bio: string;
  tags: string[];
  cities: string[];
  ratingAvg?: number;
  ratingCount?: number;
  isVisible: boolean;
  photoUrl?: string;
  embedding?: {
    provider: 'gemini';
    model: string;
    pineconeId: string;
    updatedAt: Timestamp | Date;
  };
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
};

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type Booking = {
  clientId: string;
  technicianId: string;
  serviceType: string;
  problemDescription: string;
  address: string;
  preferredDateTime: Timestamp | Date | string;
  status: BookingStatus;
  lead: {
    contacted: boolean;
    closed: boolean;
  };
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
};

export type Review = {
  bookingId: string;
  clientId: string;
  technicianId: string;
  stars: number; // 1-5
  text?: string;
  createdAt: Timestamp | Date;
};
