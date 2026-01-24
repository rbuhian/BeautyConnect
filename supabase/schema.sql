-- BeautyConnect Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('client', 'professional');
CREATE TYPE category AS ENUM ('makeup', 'hair', 'nails', 'lash', 'brow');
CREATE TYPE location_type AS ENUM ('home_service', 'salon', 'both');
CREATE TYPE booking_type AS ENUM ('instant', 'request');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE booking_location AS ENUM ('home', 'salon');

-- ============================================
-- TABLES
-- ============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  role user_role NOT NULL DEFAULT 'client',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Professional profiles
CREATE TABLE professional_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  categories category[] NOT NULL DEFAULT '{}',
  portfolio_photos TEXT[] NOT NULL DEFAULT '{}',
  service_area TEXT,
  location_type location_type NOT NULL DEFAULT 'both',
  salon_address TEXT,
  is_live BOOLEAN NOT NULL DEFAULT FALSE,
  avg_rating DECIMAL(2,1) NOT NULL DEFAULT 0,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Services offered by professionals
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category category NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2) GENERATED ALWAYS AS (price * 0.30) STORED,
  booking_type booking_type NOT NULL DEFAULT 'request',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Availability schedule for professionals
CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(professional_id, day_of_week)
);

-- Blocked dates (for vacations, etc.)
CREATE TABLE blocked_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(professional_id, date)
);

-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slot TIME NOT NULL,
  location_type booking_location NOT NULL,
  client_address TEXT,
  status booking_status NOT NULL DEFAULT 'pending',
  deposit_paid BOOLEAN NOT NULL DEFAULT FALSE,
  deposit_amount DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reviews (mutual - both client and professional can review)
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  service_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id, reviewer_id)
);

-- Messages (chat per booking)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Typing indicators (real-time)
CREATE TABLE typing_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 seconds'),
  UNIQUE(booking_id, user_id)
);

-- Favorites (clients can save professionals)
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, professional_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_professional_profiles_user_id ON professional_profiles(user_id);
CREATE INDEX idx_professional_profiles_is_live ON professional_profiles(is_live);
CREATE INDEX idx_professional_profiles_categories ON professional_profiles USING GIN(categories);
CREATE INDEX idx_services_professional_id ON services(professional_id);
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_availability_professional_id ON availability(professional_id);
CREATE INDEX idx_bookings_client_id ON bookings(client_id);
CREATE INDEX idx_bookings_professional_id ON bookings(professional_id);
CREATE INDEX idx_bookings_date ON bookings(date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX idx_messages_booking_id ON messages(booking_id);
CREATE INDEX idx_typing_indicators_booking_id ON typing_indicators(booking_id);
CREATE INDEX idx_typing_indicators_user_id ON typing_indicators(user_id);
CREATE INDEX idx_favorites_user_id ON favorites(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Professional profiles policies
CREATE POLICY "Anyone can view live professional profiles" ON professional_profiles
  FOR SELECT USING (is_live = true OR user_id = auth.uid());

CREATE POLICY "Professionals can update own profile" ON professional_profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Professionals can insert own profile" ON professional_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Services policies
CREATE POLICY "Anyone can view active services" ON services
  FOR SELECT USING (is_active = true OR professional_id IN (
    SELECT id FROM professional_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Professionals can manage own services" ON services
  FOR ALL USING (professional_id IN (
    SELECT id FROM professional_profiles WHERE user_id = auth.uid()
  ));

-- Availability policies
CREATE POLICY "Anyone can view availability" ON availability
  FOR SELECT USING (true);

CREATE POLICY "Professionals can manage own availability" ON availability
  FOR ALL USING (professional_id IN (
    SELECT id FROM professional_profiles WHERE user_id = auth.uid()
  ));

-- Blocked dates policies
CREATE POLICY "Anyone can view blocked dates" ON blocked_dates
  FOR SELECT USING (true);

CREATE POLICY "Professionals can manage own blocked dates" ON blocked_dates
  FOR ALL USING (professional_id IN (
    SELECT id FROM professional_profiles WHERE user_id = auth.uid()
  ));

-- Bookings policies
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (
    client_id = auth.uid() OR
    professional_id IN (SELECT id FROM professional_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Clients can create bookings" ON bookings
  FOR INSERT WITH CHECK (client_id = auth.uid());

CREATE POLICY "Booking participants can update" ON bookings
  FOR UPDATE USING (
    client_id = auth.uid() OR
    professional_id IN (SELECT id FROM professional_profiles WHERE user_id = auth.uid())
  );

-- Reviews policies
CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Booking participants can create reviews" ON reviews
  FOR INSERT WITH CHECK (
    reviewer_id = auth.uid() AND
    booking_id IN (
      SELECT id FROM bookings
      WHERE client_id = auth.uid() OR professional_id IN (
        SELECT id FROM professional_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Messages policies
CREATE POLICY "Booking participants can view messages" ON messages
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE client_id = auth.uid() OR professional_id IN (
        SELECT id FROM professional_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Booking participants can send messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    booking_id IN (
      SELECT id FROM bookings
      WHERE client_id = auth.uid() OR professional_id IN (
        SELECT id FROM professional_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Recipients can update messages (mark as read)" ON messages
  FOR UPDATE USING (
    sender_id != auth.uid() AND
    booking_id IN (
      SELECT id FROM bookings
      WHERE client_id = auth.uid() OR professional_id IN (
        SELECT id FROM professional_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Typing indicators policies
CREATE POLICY "Booking participants can view typing indicators" ON typing_indicators
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE client_id = auth.uid() OR professional_id IN (
        SELECT id FROM professional_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Booking participants can start typing" ON typing_indicators
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    booking_id IN (
      SELECT id FROM bookings
      WHERE client_id = auth.uid() OR professional_id IN (
        SELECT id FROM professional_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own typing status" ON typing_indicators
  FOR UPDATE USING (
    user_id = auth.uid() AND
    booking_id IN (
      SELECT id FROM bookings
      WHERE client_id = auth.uid() OR professional_id IN (
        SELECT id FROM professional_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete own typing status" ON typing_indicators
  FOR DELETE USING (
    user_id = auth.uid() AND
    booking_id IN (
      SELECT id FROM bookings
      WHERE client_id = auth.uid() OR professional_id IN (
        SELECT id FROM professional_profiles WHERE user_id = auth.uid()
      )
    )
  );


-- Favorites policies
CREATE POLICY "Users can view own favorites" ON favorites
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own favorites" ON favorites
  FOR ALL USING (user_id = auth.uid());

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_professional_profiles_updated_at
  BEFORE UPDATE ON professional_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to update professional avg_rating
CREATE OR REPLACE FUNCTION update_professional_rating()
RETURNS TRIGGER AS $$
DECLARE
  pro_profile_id UUID;
BEGIN
  -- Get the professional profile id from the reviewee
  SELECT pp.id INTO pro_profile_id
  FROM professional_profiles pp
  JOIN users u ON pp.user_id = u.id
  WHERE u.id = NEW.reviewee_id AND u.role = 'professional';

  IF pro_profile_id IS NOT NULL THEN
    UPDATE professional_profiles
    SET
      avg_rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM reviews r
        JOIN users u ON r.reviewee_id = u.id
        WHERE u.id IN (SELECT user_id FROM professional_profiles WHERE id = pro_profile_id)
      ),
      total_reviews = (
        SELECT COUNT(*)
        FROM reviews r
        JOIN users u ON r.reviewee_id = u.id
        WHERE u.id IN (SELECT user_id FROM professional_profiles WHERE id = pro_profile_id)
      )
    WHERE id = pro_profile_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rating_on_review
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_professional_rating();

-- NOTE: User profile creation is handled at the app level (src/services/auth.ts)
-- This allows for seamless seed data migration when using phone authentication

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Run these in Supabase Dashboard > Storage > Create bucket
-- Or use the Supabase client to create them

-- Bucket: avatars (public)
-- Bucket: portfolios (public)
