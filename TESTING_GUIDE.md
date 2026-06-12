# Testing Guide

## Setup: Using Seed Data (Recommended)

To test with pre-populated professional accounts, you need to run the seed data migration:

### Step 1: Run Seed Data
1. Go to your [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)
2. Run `supabase/seed-demo-data.sql` to create demo accounts
3. **IMPORTANT**: Run `supabase/fix-seed-data-users.sql` to enable seed data login

### Step 2: Test with Seed Accounts

The seed data includes ready-to-use accounts:

#### Professionals (Ready to Login)
```
- +639201111111 → Bella Garcia (Makeup, Lash specialist)
- +639202222222 → Carmen Dela Cruz (Hair specialist)
- +639203333333 → Diana Mendoza (Nails specialist)
- +639204444444 → Elena Villanueva (Lash, Brow specialist)
- +639205555555 → Fatima Ramos (Makeup, Hair, Brow specialist)
```

#### Clients (Ready to Login)
```
- +639171234567 → Maria Santos
- +639182345678 → Ana Reyes
- +639193456789 → Sofia Cruz
```

**Note**: Enter the phone number, receive OTP via SMS, and you'll automatically login as the seeded user with all their data (services, bookings, reviews, etc.)

---

## Manual Testing (Without Seed Data)

### Creating Test Accounts

#### For Client Testing
```
1. Use a new phone number (e.g., +639111111111)
2. Receive OTP via SMS
3. Select "Client" on role selection screen
4. Complete profile setup
```

#### For Professional Testing
```
1. Use a new phone number (e.g., +639222222222)
2. Receive OTP via SMS
3. Select "Professional" on role selection screen
4. Enter invite code: GLAM2024
5. Complete professional profile setup
```

---

## Why You Need fix-seed-data-users.sql

**The Problem**: When you login via phone auth, Supabase generates a random UUID for the new user. The seed data has different UUIDs, so the app can't find your professional profile.

**The Solution**: The `fix-seed-data-users.sql` script creates a database trigger that:
1. Detects when someone logs in with a seed data phone number
2. Automatically migrates all data (profile, services, bookings, reviews) to the new auth user ID
3. Makes the login seamless - you get all the seed data associated with that phone number

**Without this script**: Logging in with `+639201111111` creates a NEW user, and you'd have to set up everything manually.

**With this script**: Logging in with `+639201111111` automatically makes you "Bella Garcia" with all her services, bookings, and profile.

---

## Resetting Test Accounts

If your test phone numbers are already registered as clients and you want to test as professionals:

#### Option 1: Delete from Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. **Authentication → Users**
   - Find test user by phone number
   - Click three dots → Delete User
4. **Table Editor → users**
   - Delete the corresponding user record
5. **Table Editor → professional_profiles** (if applicable)
   - Delete any related professional profiles
6. Now you can re-register with the same phone number

#### Option 2: SQL Update (Convert Client to Professional)

If you want to convert an existing client to professional without deleting:

```sql
-- 1. Find the user ID
SELECT id, phone, role FROM users WHERE phone = '+639111111111';

-- 2. Update role to professional
UPDATE users
SET role = 'professional'
WHERE phone = '+639111111111';

-- 3. Create professional profile
INSERT INTO professional_profiles (user_id, bio, categories, portfolio_photos, service_area, location_type, is_live)
VALUES (
  'user-id-from-step-1',
  'Test professional bio',
  ARRAY['makeup', 'hair'],
  ARRAY[]::text[],
  'Metro Manila',
  'both',
  true
);
```

### Test Phone Numbers Setup

Recommended phone numbers for testing:

```
Client Accounts:
- +639111111111 → Test Client 1
- +639111111112 → Test Client 2

Professional Accounts:
- +639222222221 → Test Professional 1
- +639222222222 → Test Professional 2

Admin Testing:
- +639333333333 → Test Admin
```

### Invite Codes

For professional registration, use one of these invite codes:
- `GLAM2024` (default)
- Check the `invite_codes` table in Supabase for more codes

### Testing Workflow

1. **Create Professional Account First**
   - Register as professional
   - Complete profile setup
   - Add services
   - Set availability
   - Set profile to "Live"

2. **Create Client Account**
   - Register as client
   - Complete profile setup

3. **Test Booking Flow**
   - As client: Discover professionals
   - Book a service
   - Make payment

4. **Test Messaging**
   - From booking detail, open chat
   - Send messages from both accounts

5. **Test Reviews**
   - Complete booking
   - Leave review as client
   - Check review appears on professional profile

### Tips

- **Keep sessions separate**: Use different devices/emulators or clear app data between role switches
- **Stay logged in**: Once logged in, your session persists until you explicitly logout
- **Use real phone numbers**: You need real phones that can receive SMS for OTP
- **Database state**: Remember that all test data persists in Supabase - clean up regularly

### Logout and Switch Accounts

1. Go to Profile tab
2. Tap "Logout"
3. Login with different phone number
4. Select different role if it's a new account

---

*Last updated: 2026-01-23*
