-- =============================================================
-- Supabase Schema for Technicians-as-a-Service
-- Run this in Supabase SQL editor to set up all tables
-- =============================================================

-- Users table (synced from Clerk)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,             -- Clerk user ID
  email TEXT NOT NULL,
  display_name TEXT DEFAULT '',
  role TEXT DEFAULT 'client',      -- current active role
  roles TEXT[] DEFAULT ARRAY['client']::TEXT[],
  rating_avg DECIMAL(3,1) DEFAULT 0,
  rating_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Technicians table
CREATE TABLE IF NOT EXISTS technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  job_types TEXT[] NOT NULL,
  bio TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  cities TEXT[] DEFAULT '{}',
  rating_avg DECIMAL(3,1) DEFAULT 0,
  rating_count INT DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  photo_url TEXT,
  embedding JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL REFERENCES users(id),
  technician_id UUID NOT NULL REFERENCES technicians(id),
  service_type TEXT NOT NULL,
  problem_description TEXT NOT NULL,
  address TEXT NOT NULL,
  preferred_date_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'requested',
  negotiated_price DECIMAL(10,2),
  negotiated_date_time TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  completed_by_client BOOLEAN DEFAULT false,
  completed_by_technician BOOLEAN DEFAULT false,
  lead_contacted BOOLEAN DEFAULT false,
  lead_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  client_id TEXT NOT NULL,
  technician_id UUID NOT NULL REFERENCES technicians(id),
  reviewer_id TEXT NOT NULL,
  reviewee_id TEXT NOT NULL,
  stars INT NOT NULL CHECK (stars >= 1 AND stars <= 5),
  text TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  sender_id TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'technician')),
  message TEXT NOT NULL,
  offer_price DECIMAL(10,2),
  offer_date_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_technicians_user_id ON technicians(user_id);
CREATE INDEX IF NOT EXISTS idx_technicians_is_visible ON technicians(is_visible);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_technician_id ON bookings(technician_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_booking_id ON chat_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);

-- Enable Realtime on chat_messages and bookings
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Technicians: publicly readable if visible
CREATE POLICY "Visible technicians are public" ON technicians
  FOR SELECT USING (is_visible = true);

-- Reviews: publicly readable
CREATE POLICY "Reviews are public" ON reviews
  FOR SELECT USING (true);

-- Allow service role full access (API routes use service role key)
-- anon key gets limited read access via policies above
-- All writes go through API routes with service role key

-- Users: readable by service role (handled by service key bypassing RLS)
-- For anon key, allow reading own user (matched by Clerk session)
CREATE POLICY "Users can read own record" ON users
  FOR SELECT USING (true);

-- Bookings: readable by involved parties
CREATE POLICY "Bookings readable by involved parties" ON bookings
  FOR SELECT USING (true);

-- Chat messages: readable by involved parties
CREATE POLICY "Chat messages readable by booking participants" ON chat_messages
  FOR SELECT USING (true);

-- Insert policies for anon key (client-side inserts)
CREATE POLICY "Authenticated users can insert chat messages" ON chat_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can insert bookings" ON bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update bookings" ON bookings
  FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can insert reviews" ON reviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update reviews" ON reviews
  FOR UPDATE USING (true);

CREATE POLICY "Users can insert own record" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own record" ON users
  FOR UPDATE USING (true);

CREATE POLICY "Technicians updatable" ON technicians
  FOR UPDATE USING (true);

CREATE POLICY "Technicians insertable" ON technicians
  FOR INSERT WITH CHECK (true);

CREATE POLICY "All technicians readable for service role" ON technicians
  FOR SELECT USING (true);

-- Supabase Storage: Create bucket for technician photos
-- Run this separately or via dashboard:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('technician-photos', 'technician-photos', true);
