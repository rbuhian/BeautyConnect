-- ============================================
-- SEED DATA: Complete Test Data
-- ============================================
-- Run this after 20260125_salon_business_support.sql
-- Includes: Business, Staff, Services, Bookings
-- ============================================

-- ============================================
-- PART 1: CREATE BUSINESS
-- ============================================

INSERT INTO businesses (
  id,
  professional_id,
  business_name,
  business_type,
  logo,
  description
) VALUES (
  'b1000001-b100-0001-b100-000100010001',
  '1b1a6bad-d484-4ca9-adc8-d9e8486670d4',
  'Glam Haven Salon & Spa',
  'salon',
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300',
  'Premier beauty salon in Manila offering a complete range of beauty services. Our experienced team provides personalized service in a relaxing, luxurious environment. Open 7 days a week!'
)
ON CONFLICT (id) DO UPDATE SET
  professional_id = EXCLUDED.professional_id,
  business_name = EXCLUDED.business_name,
  description = EXCLUDED.description;

-- ============================================
-- PART 2: CREATE STAFF AUTH USERS
-- ============================================

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
  (
    'aaaa7777-aaaa-7777-aaaa-777777777777',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    NULL,
    '',
    '+639207777777',
    NOW(),
    '',
    '',
    '',
    '',
    '{"provider": "phone", "providers": ["phone"]}',
    '{"phone": "+639207777777"}',
    NOW(),
    NOW()
  ),
  (
    'bbbb8888-bbbb-8888-bbbb-888888888888',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    NULL,
    '',
    '+639208888888',
    NOW(),
    '',
    '',
    '',
    '',
    '{"provider": "phone", "providers": ["phone"]}',
    '{"phone": "+639208888888"}',
    NOW(),
    NOW()
  ),
  (
    'cccc9999-cccc-9999-cccc-999999999999',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    NULL,
    '',
    '+639209999999',
    NOW(),
    '',
    '',
    '',
    '',
    '{"provider": "phone", "providers": ["phone"]}',
    '{"phone": "+639209999999"}',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PART 3: CREATE APP USERS FOR STAFF
-- ============================================

INSERT INTO users (id, phone, name, avatar, role) VALUES
  (
    'aaaa7777-aaaa-7777-aaaa-777777777777',
    '+639207777777',
    'Hannah Lee',
    'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200',
    'professional'
  ),
  (
    'bbbb8888-bbbb-8888-bbbb-888888888888',
    '+639208888888',
    'Isabel Tan',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200',
    'professional'
  ),
  (
    'cccc9999-cccc-9999-cccc-999999999999',
    '+639209999999',
    'Jessica Wong',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200',
    'professional'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  avatar = EXCLUDED.avatar,
  role = EXCLUDED.role;

-- ============================================
-- PART 4: CREATE STAFF MEMBERS
-- ============================================

INSERT INTO staff_members (
  id,
  business_id,
  user_id,
  name,
  avatar,
  specialties,
  bio,
  is_active
) VALUES
  (
    'd1111111-d111-1111-d111-111111111111',
    'b1000001-b100-0001-b100-000100010001',
    'aaaa7777-aaaa-7777-aaaa-777777777777',
    'Hannah Lee',
    'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200',
    ARRAY['makeup', 'lash']::category[],
    'Certified makeup artist and lash technician with 6 years of experience. Specializing in bridal makeup and volume lash extensions.',
    true
  ),
  (
    'd2222222-d222-2222-d222-222222222222',
    'b1000001-b100-0001-b100-000100010001',
    'bbbb8888-bbbb-8888-bbbb-888888888888',
    'Isabel Tan',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200',
    ARRAY['hair']::category[],
    'Senior hair stylist with expertise in coloring, cutting, and styling. Trained in the latest Korean hair trends and techniques.',
    true
  ),
  (
    'd3333333-d333-3333-d333-333333333333',
    'b1000001-b100-0001-b100-000100010001',
    'cccc9999-cccc-9999-cccc-999999999999',
    'Jessica Wong',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200',
    ARRAY['nails', 'brow']::category[],
    'Nail artist and brow expert. Passionate about creating beautiful nail art and perfectly shaped brows.',
    true
  ),
  (
    'd4444444-d444-4444-d444-444444444444',
    'b1000001-b100-0001-b100-000100010001',
    NULL,
    'Karen Flores',
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200',
    ARRAY['makeup']::category[],
    'Talented makeup artist specializing in natural and glam looks.',
    true
  ),
  (
    'd5555555-d555-5555-d555-555555555555',
    'b1000001-b100-0001-b100-000100010001',
    NULL,
    'Lily Chen',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    ARRAY['hair', 'lash']::category[],
    'Experienced in hair styling and classic lash extensions.',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  bio = EXCLUDED.bio,
  is_active = EXCLUDED.is_active;

-- ============================================
-- PART 5: CREATE STAFF AVAILABILITY
-- ============================================

-- Hannah Lee (Mon-Sat, 10am-7pm)
INSERT INTO staff_availability (staff_member_id, day_of_week, start_time, end_time, is_available) VALUES
  ('d1111111-d111-1111-d111-111111111111', 1, '10:00', '19:00', true),
  ('d1111111-d111-1111-d111-111111111111', 2, '10:00', '19:00', true),
  ('d1111111-d111-1111-d111-111111111111', 3, '10:00', '19:00', true),
  ('d1111111-d111-1111-d111-111111111111', 4, '10:00', '19:00', true),
  ('d1111111-d111-1111-d111-111111111111', 5, '10:00', '19:00', true),
  ('d1111111-d111-1111-d111-111111111111', 6, '10:00', '19:00', true),
  ('d1111111-d111-1111-d111-111111111111', 0, '10:00', '19:00', false)
ON CONFLICT (staff_member_id, day_of_week) DO UPDATE SET
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  is_available = EXCLUDED.is_available;

-- Isabel Tan (Tue-Sun, 11am-8pm)
INSERT INTO staff_availability (staff_member_id, day_of_week, start_time, end_time, is_available) VALUES
  ('d2222222-d222-2222-d222-222222222222', 1, '11:00', '20:00', false),
  ('d2222222-d222-2222-d222-222222222222', 2, '11:00', '20:00', true),
  ('d2222222-d222-2222-d222-222222222222', 3, '11:00', '20:00', true),
  ('d2222222-d222-2222-d222-222222222222', 4, '11:00', '20:00', true),
  ('d2222222-d222-2222-d222-222222222222', 5, '11:00', '20:00', true),
  ('d2222222-d222-2222-d222-222222222222', 6, '11:00', '20:00', true),
  ('d2222222-d222-2222-d222-222222222222', 0, '11:00', '20:00', true)
ON CONFLICT (staff_member_id, day_of_week) DO UPDATE SET
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  is_available = EXCLUDED.is_available;

-- Jessica Wong (Mon-Sat, 9am-6pm)
INSERT INTO staff_availability (staff_member_id, day_of_week, start_time, end_time, is_available) VALUES
  ('d3333333-d333-3333-d333-333333333333', 1, '09:00', '18:00', true),
  ('d3333333-d333-3333-d333-333333333333', 2, '09:00', '18:00', true),
  ('d3333333-d333-3333-d333-333333333333', 3, '09:00', '18:00', true),
  ('d3333333-d333-3333-d333-333333333333', 4, '09:00', '18:00', true),
  ('d3333333-d333-3333-d333-333333333333', 5, '09:00', '18:00', true),
  ('d3333333-d333-3333-d333-333333333333', 6, '09:00', '18:00', true),
  ('d3333333-d333-3333-d333-333333333333', 0, '09:00', '18:00', false)
ON CONFLICT (staff_member_id, day_of_week) DO UPDATE SET
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  is_available = EXCLUDED.is_available;

-- Karen Flores (Wed-Sun, 12pm-9pm)
INSERT INTO staff_availability (staff_member_id, day_of_week, start_time, end_time, is_available) VALUES
  ('d4444444-d444-4444-d444-444444444444', 1, '12:00', '21:00', false),
  ('d4444444-d444-4444-d444-444444444444', 2, '12:00', '21:00', false),
  ('d4444444-d444-4444-d444-444444444444', 3, '12:00', '21:00', true),
  ('d4444444-d444-4444-d444-444444444444', 4, '12:00', '21:00', true),
  ('d4444444-d444-4444-d444-444444444444', 5, '12:00', '21:00', true),
  ('d4444444-d444-4444-d444-444444444444', 6, '12:00', '21:00', true),
  ('d4444444-d444-4444-d444-444444444444', 0, '12:00', '21:00', true)
ON CONFLICT (staff_member_id, day_of_week) DO UPDATE SET
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  is_available = EXCLUDED.is_available;

-- Lily Chen (Mon-Fri, 10am-7pm)
INSERT INTO staff_availability (staff_member_id, day_of_week, start_time, end_time, is_available) VALUES
  ('d5555555-d555-5555-d555-555555555555', 1, '10:00', '19:00', true),
  ('d5555555-d555-5555-d555-555555555555', 2, '10:00', '19:00', true),
  ('d5555555-d555-5555-d555-555555555555', 3, '10:00', '19:00', true),
  ('d5555555-d555-5555-d555-555555555555', 4, '10:00', '19:00', true),
  ('d5555555-d555-5555-d555-555555555555', 5, '10:00', '19:00', true),
  ('d5555555-d555-5555-d555-555555555555', 6, '10:00', '19:00', false),
  ('d5555555-d555-5555-d555-555555555555', 0, '10:00', '19:00', false)
ON CONFLICT (staff_member_id, day_of_week) DO UPDATE SET
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  is_available = EXCLUDED.is_available;

-- ============================================
-- PART 6: CREATE SERVICES
-- ============================================

INSERT INTO services (
  id,
  professional_id,
  staff_member_id,
  name,
  category,
  price,
  duration_minutes,
  is_active
) VALUES
  -- Makeup services
  (
    'e1111111-e111-1111-e111-111111111111',
    '1b1a6bad-d484-4ca9-adc8-d9e8486670d4',
    'd1111111-d111-1111-d111-111111111111', -- Hannah Lee
    'Bridal Makeup Package',
    'makeup',
    8500.00,
    180,
    true
  ),
  (
    'e2222222-e222-2222-e222-222222222222',
    '1b1a6bad-d484-4ca9-adc8-d9e8486670d4',
    'd4444444-d444-4444-d444-444444444444', -- Karen Flores
    'Party Glam Makeup',
    'makeup',
    2500.00,
    90,
    true
  ),
  (
    'e3333333-e333-3333-e333-333333333333',
    '1b1a6bad-d484-4ca9-adc8-d9e8486670d4',
    NULL, -- Any available makeup artist
    'Natural Day Makeup',
    'makeup',
    1500.00,
    60,
    true
  ),

  -- Hair services
  (
    'e4444444-e444-4444-e444-444444444444',
    '1b1a6bad-d484-4ca9-adc8-d9e8486670d4',
    'd2222222-d222-2222-d222-222222222222', -- Isabel Tan
    'Korean Hair Color & Style',
    'hair',
    5500.00,
    210,
    true
  ),
  (
    'e5555555-e555-5555-e555-555555555555',
    '1b1a6bad-d484-4ca9-adc8-d9e8486670d4',
    'd5555555-d555-5555-d555-555555555555', -- Lily Chen
    'Hair Treatment & Blow Dry',
    'hair',
    1800.00,
    90,
    true
  ),
  (
    'e6666666-e666-6666-e666-666666666666',
    '1b1a6bad-d484-4ca9-adc8-d9e8486670d4',
    NULL, -- Any available hair stylist
    'Haircut & Style',
    'hair',
    800.00,
    60,
    true
  ),

  -- Lash services
  (
    'e7777777-e777-7777-e777-777777777777',
    '1b1a6bad-d484-4ca9-adc8-d9e8486670d4',
    'd1111111-d111-1111-d111-111111111111', -- Hannah Lee
    'Volume Lash Extensions',
    'lash',
    3500.00,
    150,
    true
  ),
  (
    'e8888888-e888-8888-e888-888888888888',
    '1b1a6bad-d484-4ca9-adc8-d9e8486670d4',
    'd5555555-d555-5555-d555-555555555555', -- Lily Chen
    'Classic Lash Extensions',
    'lash',
    2200.00,
    120,
    true
  ),

  -- Nail services
  (
    'e9999999-e999-9999-e999-999999999999',
    '1b1a6bad-d484-4ca9-adc8-d9e8486670d4',
    'd3333333-d333-3333-d333-333333333333', -- Jessica Wong
    'Gel Manicure with Nail Art',
    'nails',
    1200.00,
    90,
    true
  ),
  (
    'eaaaaaaa-eaaa-aaaa-eaaa-aaaaaaaaaaaa',
    '1b1a6bad-d484-4ca9-adc8-d9e8486670d4',
    'd3333333-d333-3333-d333-333333333333', -- Jessica Wong
    'Premium Pedicure',
    'nails',
    1500.00,
    75,
    true
  ),

  -- Brow services
  (
    'ebbbbbbb-ebbb-bbbb-ebbb-bbbbbbbbbbbb',
    '1b1a6bad-d484-4ca9-adc8-d9e8486670d4',
    'd3333333-d333-3333-d333-333333333333', -- Jessica Wong
    'Brow Lamination & Tint',
    'brow',
    1800.00,
    60,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active;

-- ============================================
-- PART 7: CREATE SAMPLE BOOKINGS
-- ============================================
-- Note: Using existing client users from previous seed data
-- Client IDs: 11111111-1111-1111-1111-111111111111 (Maria Santos)
--             22222222-2222-2222-2222-222222222222 (Ana Reyes)
--             33333333-3333-3333-3333-333333333333 (Sofia Cruz)

INSERT INTO bookings (
  id,
  client_id,
  professional_id,
  staff_member_id,
  service_id,
  date,
  time_slot,
  location_type,
  client_address,
  status,
  deposit_paid,
  deposit_amount,
  total_price
) VALUES
  -- Confirmed booking: Maria Santos -> Hannah Lee (Bridal Makeup)
  (
    'f1111111-f111-1111-f111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '1b1a6bad-d484-4ca9-adc8-d9e8486670d4',
    'd1111111-d111-1111-d111-111111111111',
    'e1111111-e111-1111-e111-111111111111',
    '2026-02-14',
    '09:00',
    'salon',
    '3rd Floor, SM Mall of Asia, Pasay City, Metro Manila',
    'confirmed',
    true,
    2550.00,
    8500.00
  ),
  -- Confirmed booking: Ana Reyes -> Isabel Tan (Hair Color)
  (
    'f2222222-f222-2222-f222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '1b1a6bad-d484-4ca9-adc8-d9e8486670d4',
    'd2222222-d222-2222-d222-222222222222',
    'e4444444-e444-4444-e444-444444444444',
    '2026-02-05',
    '14:00',
    'salon',
    '3rd Floor, SM Mall of Asia, Pasay City, Metro Manila',
    'confirmed',
    true,
    1650.00,
    5500.00
  ),
  -- Pending booking: Sofia Cruz -> Jessica Wong (Gel Manicure)
  (
    'f3333333-f333-3333-f333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    '1b1a6bad-d484-4ca9-adc8-d9e8486670d4',
    'd3333333-d333-3333-d333-333333333333',
    'e9999999-e999-9999-e999-999999999999',
    '2026-02-03',
    '15:00',
    'salon',
    '3rd Floor, SM Mall of Asia, Pasay City, Metro Manila',
    'pending',
    false,
    360.00,
    1200.00
  ),
  -- Completed booking: Maria Santos -> Lily Chen (Lash Extensions)
  (
    'f4444444-f444-4444-f444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    '1b1a6bad-d484-4ca9-adc8-d9e8486670d4',
    'd5555555-d555-5555-d555-555555555555',
    'e8888888-e888-8888-e888-888888888888',
    '2026-01-25',
    '11:00',
    'salon',
    '3rd Floor, SM Mall of Asia, Pasay City, Metro Manila',
    'completed',
    true,
    660.00,
    2200.00
  )
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  deposit_paid = EXCLUDED.deposit_paid,
  deposit_amount = EXCLUDED.deposit_amount,
  total_price = EXCLUDED.total_price;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✓ Seed data created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '- Business: Glam Haven Salon & Spa';
  RAISE NOTICE '- 5 Staff Members with availability';
  RAISE NOTICE '- 11 Services across all categories';
  RAISE NOTICE '- 4 Sample bookings (pending, confirmed, completed)';
  RAISE NOTICE '';
  RAISE NOTICE 'Business Owner Login:';
  RAISE NOTICE '  Phone: +639206666666';
  RAISE NOTICE '  Name: Gloria Salon Owner';
  RAISE NOTICE '';
  RAISE NOTICE 'Staff Logins:';
  RAISE NOTICE '  • Hannah Lee: +639207777777';
  RAISE NOTICE '  • Isabel Tan: +639208888888';
  RAISE NOTICE '  • Jessica Wong: +639209999999';
  RAISE NOTICE '';
END $$;
