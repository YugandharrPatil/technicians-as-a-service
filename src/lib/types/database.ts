export type UserRole = 'client' | 'technician';

export type User = {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  roles?: UserRole[];
  rating_avg?: number;
  rating_count?: number;
  created_at: string;
};

export type JobType = 'plumber' | 'electrician' | 'carpenter' | 'maintenance' | 'hvac' | 'appliance_repair' | 'handyman' | 'carpentry';

export type Technician = {
  id: string;
  user_id?: string;
  name: string;
  job_types: JobType[];
  bio: string;
  tags: string[];
  cities: string[];
  rating_avg?: number;
  rating_count?: number;
  is_visible: boolean;
  photo_url?: string;
  embedding?: {
    provider: 'gemini';
    model: string;
    pineconeId: string;
    updatedAt: string;
  };
  created_at?: string;
  updated_at?: string;
};

export type BookingStatus = 'requested' | 'accepted' | 'rejected' | 'confirmed' | 'completed';

export type Booking = {
  id: string;
  client_id: string;
  technician_id: string;
  service_type: string;
  problem_description: string;
  address: string;
  preferred_date_time: string;
  status: BookingStatus;
  negotiated_price?: number;
  negotiated_date_time?: string;
  accepted_at?: string;
  completed_by_client?: boolean;
  completed_by_technician?: boolean;
  lead_contacted: boolean;
  lead_closed: boolean;
  created_at: string;
  updated_at?: string;
};

export type Review = {
  id: string;
  booking_id: string;
  client_id: string;
  technician_id: string;
  reviewer_id: string;
  reviewee_id: string;
  stars: number;
  text?: string;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  booking_id: string;
  sender_id: string;
  sender_type: 'client' | 'technician';
  message: string;
  offer_price?: number;
  offer_date_time?: string;
  created_at: string;
};
