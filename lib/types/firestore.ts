import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'client' | 'technician';

export type User = {
  email: string;
  displayName: string;
  role: UserRole; // Current active role (for backward compatibility and current context)
  roles?: UserRole[]; // All roles this user has (for multi-role support)
  ratingAvg?: number;
  ratingCount?: number;
  createdAt: Timestamp | Date;
};

export type JobType = 'plumber' | 'electrician' | 'carpenter' | 'maintenance' | 'hvac' | 'appliance_repair' | 'handyman' | 'carpentry';

export type Technician = {
  userId?: string; // Link to users collection (optional, set when technician signs up)
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

export type BookingStatus = 'requested' | 'accepted' | 'rejected' | 'confirmed' | 'completed';

export type Booking = {
  clientId: string;
  technicianId: string;
  serviceType: string;
  problemDescription: string;
  address: string;
  preferredDateTime: Timestamp | Date | string;
  status: BookingStatus;
  negotiatedPrice?: number;
  negotiatedDateTime?: Timestamp | Date | string;
  acceptedAt?: Timestamp | Date;
  completedByClient?: boolean;
  completedByTechnician?: boolean;
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
  reviewerId: string; // ID of the user giving the review
  revieweeId: string; // ID of the user being reviewed
  stars: number; // 1-5
  text?: string;
  createdAt: Timestamp | Date;
};

export type ChatMessage = {
  bookingId: string;
  senderId: string; // clientId or technicianId
  senderType: 'client' | 'technician';
  message: string;
  createdAt: Timestamp | Date;
  offer?: {
    price: number;
    dateTime: Timestamp | Date | string;
  };
};
