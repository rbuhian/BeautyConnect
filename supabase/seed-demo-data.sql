-- BeautyConnect Demo Data Seed
-- Run this AFTER schema.sql to populate test data
-- This creates realistic demo data for testing the app

-- ============================================
-- IMPORTANT: Run this in Supabase SQL Editor
-- Make sure to run schema.sql first!
-- ============================================

-- ============================================
-- STEP 1: CREATE AUTH USERS
-- We need to insert into auth.users first due to foreign key constraint
-- ============================================

-- Insert demo users into auth.users (required for foreign key)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  phone,
  phone_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES
  -- Client Users
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    NULL,
    '',
    '+639171234567',
    NOW(),
    '',
    '',
    '',
    '',
    '{"provider": "phone", "providers": ["phone"]}',
    '{"phone": "+639171234567"}',
    NOW(),
    NOW()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    NULL,
    '',
    '+639182345678',
    NOW(),
    '',
    '',
    '',
    '',
    '{"provider": "phone", "providers": ["phone"]}',
    '{"phone": "+639182345678"}',
    NOW(),
    NOW()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    NULL,
    '',
    '+639193456789',
    NOW(),
    '',
    '',
    '',
    '',
    '{"provider": "phone", "providers": ["phone"]}',
    '{"phone": "+639193456789"}',
    NOW(),
    NOW()
  ),
  -- Professional Users
  (
    'aaaa1111-aaaa-1111-aaaa-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    NULL,
    '',
    '+639201111111',
    NOW(),
    '',
    '',
    '',
    '',
    '{"provider": "phone", "providers": ["phone"]}',
    '{"phone": "+639201111111"}',
    NOW(),
    NOW()
  ),
  (
    'bbbb2222-bbbb-2222-bbbb-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    NULL,
    '',
    '+639202222222',
    NOW(),
    '',
    '',
    '',
    '',
    '{"provider": "phone", "providers": ["phone"]}',
    '{"phone": "+639202222222"}',
    NOW(),
    NOW()
  ),
  (
    'cccc3333-cccc-3333-cccc-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    NULL,
    '',
    '+639203333333',
    NOW(),
    '',
    '',
    '',
    '',
    '{"provider": "phone", "providers": ["phone"]}',
    '{"phone": "+639203333333"}',
    NOW(),
    NOW()
  ),
  (
    'dddd4444-dddd-4444-dddd-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    NULL,
    '',
    '+639204444444',
    NOW(),
    '',
    '',
    '',
    '',
    '{"provider": "phone", "providers": ["phone"]}',
    '{"phone": "+639204444444"}',
    NOW(),
    NOW()
  ),
  (
    'eeee5555-eeee-5555-eeee-555555555555',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    NULL,
    '',
    '+639205555555',
    NOW(),
    '',
    '',
    '',
    '',
    '{"provider": "phone", "providers": ["phone"]}',
    '{"phone": "+639205555555"}',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 2: CREATE APP USERS
-- ============================================

-- Client Users
INSERT INTO users (id, phone, name, avatar, role) VALUES
  ('11111111-1111-1111-1111-111111111111', '+639171234567', 'Maria Santos', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200', 'client'),
  ('22222222-2222-2222-2222-222222222222', '+639182345678', 'Ana Reyes', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200', 'client'),
  ('33333333-3333-3333-3333-333333333333', '+639193456789', 'Sofia Cruz', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200', 'client')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, avatar = EXCLUDED.avatar;

-- Professional Users
INSERT INTO users (id, phone, name, avatar, role) VALUES
  ('aaaa1111-aaaa-1111-aaaa-111111111111', '+639201111111', 'Bella Garcia', 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=200', 'professional'),
  ('bbbb2222-bbbb-2222-bbbb-222222222222', '+639202222222', 'Carmen Dela Cruz', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200', 'professional'),
  ('cccc3333-cccc-3333-cccc-333333333333', '+639203333333', 'Diana Mendoza', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200', 'professional'),
  ('dddd4444-dddd-4444-dddd-444444444444', '+639204444444', 'Elena Villanueva', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200', 'professional'),
  ('eeee5555-eeee-5555-eeee-555555555555', '+639205555555', 'Fatima Ramos', 'https://images.unsplash.com/photo-1516914943479-89db7d9ae7f2?w=200', 'professional')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, avatar = EXCLUDED.avatar, role = EXCLUDED.role;

-- ============================================
-- PROFESSIONAL PROFILES
-- ============================================

INSERT INTO professional_profiles (id, user_id, bio, categories, portfolio_photos, service_area, location_type, salon_address, is_live, avg_rating, total_reviews) VALUES
  (
    'a0001111-a000-1111-a000-111111111111',
    'aaaa1111-aaaa-1111-aaaa-111111111111',
    'Professional makeup artist with 8 years of experience specializing in bridal and special occasion makeup. Trained in Korea and certified by MAC Cosmetics. I believe every woman deserves to feel beautiful on her special day!',
    ARRAY['makeup', 'lash']::category[],
    ARRAY[
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400',
      'https://images.unsplash.com/photo-1503236823255-94609f598e71?w=400',
      'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=400'
    ],
    'Makati City',
    'both',
    'Unit 301, Beauty Tower, Makati Ave, Makati City',
    true,
    4.8,
    24
  ),
  (
    'b0002222-b000-2222-b000-222222222222',
    'bbbb2222-bbbb-2222-bbbb-222222222222',
    'Hair styling expert passionate about creating stunning looks for every occasion. Specializing in hair coloring, treatments, and bridal hairstyles. Let me transform your hair into a masterpiece!',
    ARRAY['hair']::category[],
    ARRAY[
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
      'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=400'
    ],
    'BGC, Taguig',
    'salon',
    'G/F, High Street South, BGC, Taguig',
    true,
    4.9,
    31
  ),
  (
    'c0003333-c000-3333-c000-333333333333',
    'cccc3333-cccc-3333-cccc-333333333333',
    'Nail artist and technician with a passion for creative nail designs. From classic manicures to intricate nail art, I bring your nail dreams to life. Home service available within Metro Manila!',
    ARRAY['nails']::category[],
    ARRAY[
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400',
      'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=400',
      'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400'
    ],
    'Quezon City',
    'home_service',
    NULL,
    true,
    4.7,
    18
  ),
  (
    'd0004444-d000-4444-d000-444444444444',
    'dddd4444-dddd-4444-dddd-444444444444',
    'Certified lash technician specializing in classic, volume, and mega volume lash extensions. Using only premium Korean and Japanese products. Your satisfaction is my priority!',
    ARRAY['lash', 'brow']::category[],
    ARRAY[
      'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?w=400',
      'https://images.unsplash.com/photo-1516914943479-89db7d9ae7f2?w=400',
      'https://images.unsplash.com/photo-1522337094846-8a818192de1f?w=400'
    ],
    'Pasig City',
    'both',
    '2F, Kapitolyo Arcade, Pasig City',
    true,
    4.6,
    15
  ),
  (
    'e0005555-e000-5555-e000-555555555555',
    'eeee5555-eeee-5555-eeee-555555555555',
    'Multi-talented beauty professional offering makeup, hair, and brow services. Perfect for one-stop glam sessions! 5 years experience in the industry with celebrity clients.',
    ARRAY['makeup', 'hair', 'brow']::category[],
    ARRAY[
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400',
      'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400',
      'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400'
    ],
    'Mandaluyong',
    'home_service',
    NULL,
    true,
    4.5,
    12
  )
ON CONFLICT (id) DO UPDATE SET
  bio = EXCLUDED.bio,
  categories = EXCLUDED.categories,
  portfolio_photos = EXCLUDED.portfolio_photos,
  is_live = EXCLUDED.is_live;

-- ============================================
-- SERVICES
-- ============================================

-- Bella Garcia's Services (Makeup & Lash)
INSERT INTO services (id, professional_id, name, category, duration_minutes, price, booking_type, is_active) VALUES
  ('10011001-1001-1001-1001-100110010001', 'a0001111-a000-1111-a000-111111111111', 'Bridal Makeup', 'makeup', 120, 5000.00, 'request', true),
  ('10011001-1001-1001-1001-100110010002', 'a0001111-a000-1111-a000-111111111111', 'Evening Glam', 'makeup', 90, 3500.00, 'instant', true),
  ('10011001-1001-1001-1001-100110010003', 'a0001111-a000-1111-a000-111111111111', 'Natural Day Look', 'makeup', 60, 2000.00, 'instant', true),
  ('10011001-1001-1001-1001-100110010004', 'a0001111-a000-1111-a000-111111111111', 'Classic Lash Extensions', 'lash', 90, 2500.00, 'instant', true),
  ('10011001-1001-1001-1001-100110010005', 'a0001111-a000-1111-a000-111111111111', 'Volume Lash Extensions', 'lash', 120, 3500.00, 'request', true)
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, is_active = EXCLUDED.is_active;

-- Carmen Dela Cruz's Services (Hair)
INSERT INTO services (id, professional_id, name, category, duration_minutes, price, booking_type, is_active) VALUES
  ('20022002-2002-2002-2002-200220020001', 'b0002222-b000-2222-b000-222222222222', 'Bridal Hairstyling', 'hair', 120, 4500.00, 'request', true),
  ('20022002-2002-2002-2002-200220020002', 'b0002222-b000-2222-b000-222222222222', 'Hair Coloring (Full)', 'hair', 180, 5000.00, 'request', true),
  ('20022002-2002-2002-2002-200220020003', 'b0002222-b000-2222-b000-222222222222', 'Highlights/Balayage', 'hair', 150, 4000.00, 'request', true),
  ('20022002-2002-2002-2002-200220020004', 'b0002222-b000-2222-b000-222222222222', 'Haircut & Styling', 'hair', 60, 1500.00, 'instant', true),
  ('20022002-2002-2002-2002-200220020005', 'b0002222-b000-2222-b000-222222222222', 'Keratin Treatment', 'hair', 180, 6000.00, 'request', true),
  ('20022002-2002-2002-2002-200220020006', 'b0002222-b000-2222-b000-222222222222', 'Blowout & Styling', 'hair', 45, 800.00, 'instant', true)
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, is_active = EXCLUDED.is_active;

-- Diana Mendoza's Services (Nails)
INSERT INTO services (id, professional_id, name, category, duration_minutes, price, booking_type, is_active) VALUES
  ('30033003-3003-3003-3003-300330030001', 'c0003333-c000-3333-c000-333333333333', 'Classic Manicure', 'nails', 45, 500.00, 'instant', true),
  ('30033003-3003-3003-3003-300330030002', 'c0003333-c000-3333-c000-333333333333', 'Classic Pedicure', 'nails', 60, 600.00, 'instant', true),
  ('30033003-3003-3003-3003-300330030003', 'c0003333-c000-3333-c000-333333333333', 'Gel Manicure', 'nails', 60, 800.00, 'instant', true),
  ('30033003-3003-3003-3003-300330030004', 'c0003333-c000-3333-c000-333333333333', 'Nail Art (per nail)', 'nails', 15, 100.00, 'instant', true),
  ('30033003-3003-3003-3003-300330030005', 'c0003333-c000-3333-c000-333333333333', 'Full Set Acrylic', 'nails', 120, 1800.00, 'request', true),
  ('30033003-3003-3003-3003-300330030006', 'c0003333-c000-3333-c000-333333333333', 'Mani-Pedi Combo', 'nails', 90, 1000.00, 'instant', true)
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, is_active = EXCLUDED.is_active;

-- Elena Villanueva's Services (Lash & Brow)
INSERT INTO services (id, professional_id, name, category, duration_minutes, price, booking_type, is_active) VALUES
  ('40044004-4004-4004-4004-400440040001', 'd0004444-d000-4444-d000-444444444444', 'Classic Lash Extensions', 'lash', 90, 2000.00, 'instant', true),
  ('40044004-4004-4004-4004-400440040002', 'd0004444-d000-4444-d000-444444444444', 'Volume Lash Extensions', 'lash', 120, 3000.00, 'instant', true),
  ('40044004-4004-4004-4004-400440040003', 'd0004444-d000-4444-d000-444444444444', 'Mega Volume Lashes', 'lash', 150, 4000.00, 'request', true),
  ('40044004-4004-4004-4004-400440040004', 'd0004444-d000-4444-d000-444444444444', 'Lash Lift & Tint', 'lash', 60, 1500.00, 'instant', true),
  ('40044004-4004-4004-4004-400440040005', 'd0004444-d000-4444-d000-444444444444', 'Brow Shaping', 'brow', 30, 500.00, 'instant', true),
  ('40044004-4004-4004-4004-400440040006', 'd0004444-d000-4444-d000-444444444444', 'Brow Lamination', 'brow', 60, 1200.00, 'instant', true),
  ('40044004-4004-4004-4004-400440040007', 'd0004444-d000-4444-d000-444444444444', 'Microblading', 'brow', 120, 8000.00, 'request', true)
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, is_active = EXCLUDED.is_active;

-- Fatima Ramos's Services (Makeup, Hair & Brow)
INSERT INTO services (id, professional_id, name, category, duration_minutes, price, booking_type, is_active) VALUES
  ('50055005-5005-5005-5005-500550050001', 'e0005555-e000-5555-e000-555555555555', 'Party Makeup', 'makeup', 60, 2500.00, 'instant', true),
  ('50055005-5005-5005-5005-500550050002', 'e0005555-e000-5555-e000-555555555555', 'Editorial Makeup', 'makeup', 90, 4000.00, 'request', true),
  ('50055005-5005-5005-5005-500550050003', 'e0005555-e000-5555-e000-555555555555', 'Hair Updo', 'hair', 60, 2000.00, 'instant', true),
  ('50055005-5005-5005-5005-500550050004', 'e0005555-e000-5555-e000-555555555555', 'Hair & Makeup Package', 'makeup', 150, 5500.00, 'request', true),
  ('50055005-5005-5005-5005-500550050005', 'e0005555-e000-5555-e000-555555555555', 'Brow Tinting', 'brow', 30, 600.00, 'instant', true),
  ('50055005-5005-5005-5005-500550050006', 'e0005555-e000-5555-e000-555555555555', 'Brow Waxing', 'brow', 20, 400.00, 'instant', true)
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, is_active = EXCLUDED.is_active;

-- ============================================
-- AVAILABILITY
-- ============================================

-- Bella Garcia - Monday to Saturday, 9 AM - 6 PM
INSERT INTO availability (id, professional_id, day_of_week, start_time, end_time, is_available) VALUES
  ('a1001001-1001-1001-1001-100110010001', 'a0001111-a000-1111-a000-111111111111', 1, '09:00', '18:00', true),
  ('a1001001-1001-1001-1001-100110010002', 'a0001111-a000-1111-a000-111111111111', 2, '09:00', '18:00', true),
  ('a1001001-1001-1001-1001-100110010003', 'a0001111-a000-1111-a000-111111111111', 3, '09:00', '18:00', true),
  ('a1001001-1001-1001-1001-100110010004', 'a0001111-a000-1111-a000-111111111111', 4, '09:00', '18:00', true),
  ('a1001001-1001-1001-1001-100110010005', 'a0001111-a000-1111-a000-111111111111', 5, '09:00', '18:00', true),
  ('a1001001-1001-1001-1001-100110010006', 'a0001111-a000-1111-a000-111111111111', 6, '09:00', '17:00', true)
ON CONFLICT (professional_id, day_of_week) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time;

-- Carmen Dela Cruz - Tuesday to Sunday, 10 AM - 8 PM
INSERT INTO availability (id, professional_id, day_of_week, start_time, end_time, is_available) VALUES
  ('a2002002-2002-2002-2002-200220020001', 'b0002222-b000-2222-b000-222222222222', 0, '10:00', '18:00', true),
  ('a2002002-2002-2002-2002-200220020002', 'b0002222-b000-2222-b000-222222222222', 2, '10:00', '20:00', true),
  ('a2002002-2002-2002-2002-200220020003', 'b0002222-b000-2222-b000-222222222222', 3, '10:00', '20:00', true),
  ('a2002002-2002-2002-2002-200220020004', 'b0002222-b000-2222-b000-222222222222', 4, '10:00', '20:00', true),
  ('a2002002-2002-2002-2002-200220020005', 'b0002222-b000-2222-b000-222222222222', 5, '10:00', '20:00', true),
  ('a2002002-2002-2002-2002-200220020006', 'b0002222-b000-2222-b000-222222222222', 6, '10:00', '20:00', true)
ON CONFLICT (professional_id, day_of_week) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time;

-- Diana Mendoza - Monday to Friday, 8 AM - 5 PM (Home Service)
INSERT INTO availability (id, professional_id, day_of_week, start_time, end_time, is_available) VALUES
  ('a3003003-3003-3003-3003-300330030001', 'c0003333-c000-3333-c000-333333333333', 1, '08:00', '17:00', true),
  ('a3003003-3003-3003-3003-300330030002', 'c0003333-c000-3333-c000-333333333333', 2, '08:00', '17:00', true),
  ('a3003003-3003-3003-3003-300330030003', 'c0003333-c000-3333-c000-333333333333', 3, '08:00', '17:00', true),
  ('a3003003-3003-3003-3003-300330030004', 'c0003333-c000-3333-c000-333333333333', 4, '08:00', '17:00', true),
  ('a3003003-3003-3003-3003-300330030005', 'c0003333-c000-3333-c000-333333333333', 5, '08:00', '17:00', true)
ON CONFLICT (professional_id, day_of_week) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time;

-- Elena Villanueva - Wednesday to Monday, 11 AM - 7 PM
INSERT INTO availability (id, professional_id, day_of_week, start_time, end_time, is_available) VALUES
  ('a4004004-4004-4004-4004-400440040001', 'd0004444-d000-4444-d000-444444444444', 0, '11:00', '18:00', true),
  ('a4004004-4004-4004-4004-400440040002', 'd0004444-d000-4444-d000-444444444444', 1, '11:00', '19:00', true),
  ('a4004004-4004-4004-4004-400440040003', 'd0004444-d000-4444-d000-444444444444', 3, '11:00', '19:00', true),
  ('a4004004-4004-4004-4004-400440040004', 'd0004444-d000-4444-d000-444444444444', 4, '11:00', '19:00', true),
  ('a4004004-4004-4004-4004-400440040005', 'd0004444-d000-4444-d000-444444444444', 5, '11:00', '19:00', true),
  ('a4004004-4004-4004-4004-400440040006', 'd0004444-d000-4444-d000-444444444444', 6, '11:00', '19:00', true)
ON CONFLICT (professional_id, day_of_week) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time;

-- Fatima Ramos - Flexible (Everyday except Tuesday), 7 AM - 9 PM
INSERT INTO availability (id, professional_id, day_of_week, start_time, end_time, is_available) VALUES
  ('a5005005-5005-5005-5005-500550050001', 'e0005555-e000-5555-e000-555555555555', 0, '07:00', '21:00', true),
  ('a5005005-5005-5005-5005-500550050002', 'e0005555-e000-5555-e000-555555555555', 1, '07:00', '21:00', true),
  ('a5005005-5005-5005-5005-500550050003', 'e0005555-e000-5555-e000-555555555555', 3, '07:00', '21:00', true),
  ('a5005005-5005-5005-5005-500550050004', 'e0005555-e000-5555-e000-555555555555', 4, '07:00', '21:00', true),
  ('a5005005-5005-5005-5005-500550050005', 'e0005555-e000-5555-e000-555555555555', 5, '07:00', '21:00', true),
  ('a5005005-5005-5005-5005-500550050006', 'e0005555-e000-5555-e000-555555555555', 6, '07:00', '21:00', true)
ON CONFLICT (professional_id, day_of_week) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time;

-- ============================================
-- SAMPLE BOOKINGS
-- ============================================

-- Completed bookings (for review testing)
INSERT INTO bookings (id, client_id, professional_id, service_id, date, time_slot, location_type, client_address, status, deposit_paid, deposit_amount, total_price, created_at) VALUES
  (
    'b0010001-0001-0001-0001-000100010001',
    '11111111-1111-1111-1111-111111111111',
    'a0001111-a000-1111-a000-111111111111',
    '10011001-1001-1001-1001-100110010002',
    '2026-01-10',
    '14:00',
    'salon',
    NULL,
    'completed',
    true,
    1050.00,
    3500.00,
    '2026-01-08 10:00:00+08'
  ),
  (
    'b0010001-0001-0001-0001-000100010002',
    '22222222-2222-2222-2222-222222222222',
    'b0002222-b000-2222-b000-222222222222',
    '20022002-2002-2002-2002-200220020004',
    '2026-01-12',
    '11:00',
    'salon',
    NULL,
    'completed',
    true,
    450.00,
    1500.00,
    '2026-01-10 09:00:00+08'
  ),
  (
    'b0010001-0001-0001-0001-000100010003',
    '33333333-3333-3333-3333-333333333333',
    'c0003333-c000-3333-c000-333333333333',
    '30033003-3003-3003-3003-300330030006',
    '2026-01-15',
    '10:00',
    'home',
    '123 Main Street, Quezon City',
    'completed',
    true,
    300.00,
    1000.00,
    '2026-01-13 14:00:00+08'
  )
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- Upcoming confirmed bookings
INSERT INTO bookings (id, client_id, professional_id, service_id, date, time_slot, location_type, client_address, status, deposit_paid, deposit_amount, total_price, created_at) VALUES
  (
    'b0020002-0002-0002-0002-000200020001',
    '11111111-1111-1111-1111-111111111111',
    'd0004444-d000-4444-d000-444444444444',
    '40044004-4004-4004-4004-400440040002',
    '2026-01-25',
    '13:00',
    'salon',
    NULL,
    'confirmed',
    true,
    900.00,
    3000.00,
    '2026-01-18 16:00:00+08'
  ),
  (
    'b0020002-0002-0002-0002-000200020002',
    '22222222-2222-2222-2222-222222222222',
    'e0005555-e000-5555-e000-555555555555',
    '50055005-5005-5005-5005-500550050004',
    '2026-01-28',
    '09:00',
    'home',
    '456 Oak Avenue, Mandaluyong',
    'confirmed',
    true,
    1650.00,
    5500.00,
    '2026-01-19 11:00:00+08'
  )
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- Pending booking (awaiting professional confirmation)
INSERT INTO bookings (id, client_id, professional_id, service_id, date, time_slot, location_type, client_address, status, deposit_paid, deposit_amount, total_price, created_at) VALUES
  (
    'b0030003-0003-0003-0003-000300030001',
    '33333333-3333-3333-3333-333333333333',
    'a0001111-a000-1111-a000-111111111111',
    '10011001-1001-1001-1001-100110010001',
    '2026-02-14',
    '08:00',
    'home',
    '789 Love Lane, Makati City',
    'pending',
    true,
    1500.00,
    5000.00,
    '2026-01-19 08:00:00+08'
  )
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- ============================================
-- SAMPLE REVIEWS
-- ============================================

INSERT INTO reviews (id, booking_id, reviewer_id, reviewee_id, rating, text, service_name, created_at) VALUES
  (
    'e0010001-0001-0001-0001-000100010001',
    'b0010001-0001-0001-0001-000100010001',
    '11111111-1111-1111-1111-111111111111',
    'aaaa1111-aaaa-1111-aaaa-111111111111',
    5,
    'Bella did an amazing job with my evening makeup! I received so many compliments at the party. Highly recommend her services!',
    'Evening Glam',
    '2026-01-11 10:00:00+08'
  ),
  (
    'e0010001-0001-0001-0001-000100010002',
    'b0010001-0001-0001-0001-000100010002',
    '22222222-2222-2222-2222-222222222222',
    'bbbb2222-bbbb-2222-bbbb-222222222222',
    5,
    'Carmen is a true hair artist! My haircut turned out perfect. The salon is beautiful and the service was excellent.',
    'Haircut & Styling',
    '2026-01-13 15:00:00+08'
  ),
  (
    'e0010001-0001-0001-0001-000100010003',
    'b0010001-0001-0001-0001-000100010003',
    '33333333-3333-3333-3333-333333333333',
    'cccc3333-cccc-3333-cccc-333333333333',
    4,
    'Diana was very professional and arrived on time. My nails look great! The home service was so convenient.',
    'Mani-Pedi Combo',
    '2026-01-16 12:00:00+08'
  )
ON CONFLICT (id) DO UPDATE SET rating = EXCLUDED.rating, text = EXCLUDED.text;

-- Add more reviews for professionals to boost their rating counts
INSERT INTO reviews (id, booking_id, reviewer_id, reviewee_id, rating, text, service_name, created_at) VALUES
  (
    'e0020002-0002-0002-0002-000200020001',
    'b0010001-0001-0001-0001-000100010001',
    '22222222-2222-2222-2222-222222222222',
    'aaaa1111-aaaa-1111-aaaa-111111111111',
    5,
    'Best makeup artist in Makati! So talented and professional.',
    'Bridal Makeup',
    '2026-01-05 10:00:00+08'
  ),
  (
    'e0020002-0002-0002-0002-000200020002',
    'b0010001-0001-0001-0001-000100010002',
    '33333333-3333-3333-3333-333333333333',
    'bbbb2222-bbbb-2222-bbbb-222222222222',
    5,
    'Love my new hair color! Carmen really knows her craft.',
    'Hair Coloring (Full)',
    '2026-01-07 14:00:00+08'
  )
ON CONFLICT (id) DO UPDATE SET rating = EXCLUDED.rating, text = EXCLUDED.text;

-- ============================================
-- FAVORITES
-- ============================================

INSERT INTO favorites (id, user_id, professional_id, created_at) VALUES
  ('fa000001-0001-0001-0001-000100010001', '11111111-1111-1111-1111-111111111111', 'a0001111-a000-1111-a000-111111111111', NOW()),
  ('fa000002-0002-0002-0002-000200020002', '11111111-1111-1111-1111-111111111111', 'b0002222-b000-2222-b000-222222222222', NOW()),
  ('fa000003-0003-0003-0003-000300030003', '22222222-2222-2222-2222-222222222222', 'c0003333-c000-3333-c000-333333333333', NOW()),
  ('fa000004-0004-0004-0004-000400040004', '22222222-2222-2222-2222-222222222222', 'd0004444-d000-4444-d000-444444444444', NOW()),
  ('fa000005-0005-0005-0005-000500050005', '33333333-3333-3333-3333-333333333333', 'e0005555-e000-5555-e000-555555555555', NOW())
ON CONFLICT (user_id, professional_id) DO NOTHING;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Demo data successfully loaded!';
  RAISE NOTICE '';
  RAISE NOTICE '📱 Demo Accounts:';
  RAISE NOTICE '   Clients:';
  RAISE NOTICE '   - Maria Santos (+639171234567)';
  RAISE NOTICE '   - Ana Reyes (+639182345678)';
  RAISE NOTICE '   - Sofia Cruz (+639193456789)';
  RAISE NOTICE '';
  RAISE NOTICE '   Professionals:';
  RAISE NOTICE '   - Bella Garcia (+639201111111) - Makeup, Lash';
  RAISE NOTICE '   - Carmen Dela Cruz (+639202222222) - Hair';
  RAISE NOTICE '   - Diana Mendoza (+639203333333) - Nails';
  RAISE NOTICE '   - Elena Villanueva (+639204444444) - Lash, Brow';
  RAISE NOTICE '   - Fatima Ramos (+639205555555) - Makeup, Hair, Brow';
  RAISE NOTICE '';
  RAISE NOTICE '🔑 For testing in dev mode, use any 6-digit OTP code (e.g., 123456)';
END $$;
