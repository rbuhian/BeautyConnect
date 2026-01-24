# Supabase Database Setup

This directory contains all the SQL scripts needed to set up your BeautyConnect database.

## Quick Setup (For Testing)

Run these scripts in order in your [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql):

```sql
1. schema.sql              -- Creates all tables, RLS policies, functions
2. seed-demo-data.sql      -- Populates with demo professionals and clients
```

**If upgrading from an older version**, also run:
```sql
3. remove_old_trigger.sql  -- Removes old auth trigger (prevents duplicate users)
```

That's it! The app handles seed data migration automatically when you login.

## Database Files

### 1. schema.sql

**Purpose**: Creates the complete database structure

**What it does**:
- Creates all tables (users, professional_profiles, services, bookings, reviews, messages, etc.)
- Sets up Row Level Security (RLS) policies for data protection
- Creates database functions and triggers
- Defines custom types (category, booking_status, etc.)

**When to run**: First time setting up the database, or when resetting everything

### 2. seed-demo-data.sql

**Purpose**: Populates database with realistic test data

**What it creates**:
- 3 Client accounts with booking history
- 5 Professional accounts with complete profiles:
  - Services (makeup, hair, nails, lash, brow)
  - Availability schedules
  - Portfolio photos
  - Reviews and ratings
- Sample bookings (completed, confirmed, pending)
- Sample messages
- Sample reviews
- Favorites

**Demo Accounts**:

| Phone | Name | Role | Specialties |
|-------|------|------|-------------|
| +639201111111 | Bella Garcia | Professional | Makeup, Lash |
| +639202222222 | Carmen Dela Cruz | Professional | Hair |
| +639203333333 | Diana Mendoza | Professional | Nails |
| +639204444444 | Elena Villanueva | Professional | Lash, Brow |
| +639205555555 | Fatima Ramos | Professional | Makeup, Hair, Brow |
| +639171234567 | Maria Santos | Client | - |
| +639182345678 | Ana Reyes | Client | - |
| +639193456789 | Sofia Cruz | Client | - |

**When to run**: After schema.sql, before testing the app

### 3. migrations/20260122_add_typing_indicators.sql

**Purpose**: Adds typing indicators feature to chat

**When to run**: After schema.sql if typing indicators table doesn't exist

---

## How Seed Data Works with Phone Auth

### The Problem

When you login via phone OTP:
1. Supabase creates a new auth user with a random UUID
2. Your seed data has different UUIDs
3. Without migration, the app can't find your professional profile

### The Solution: App-Level Migration

The app automatically migrates seed data when you login! Here's how:

```
User logs in with +639201111111
   ↓
Receives and enters OTP
   ↓
App detects this phone exists in seed data
   ↓
Automatically migrates all data:
   - User profile (name, avatar, role)
   - Professional profile (bio, services, portfolio)
   - Services with updated references
   - Bookings with updated professional_id and service_id
   - Messages with updated booking_id
   - Reviews with updated references
   - Favorites with updated professional_id
   ↓
You're now logged in as "Bella Garcia" with all bookings and messages!
```

**Implementation**: The migration logic is in `src/services/auth.ts` in the `migrateSeedDataToNewUser()` function.

**Advantages**:
- No database triggers needed
- Works in all Supabase environments
- Easier to debug (console logs)
- Handles all foreign key relationships correctly

---

## Testing Workflow

### Option A: With Seed Data (Recommended)

```bash
# 1. Run SQL scripts in Supabase
schema.sql → seed-demo-data.sql

# 2. Start your app
npx expo start

# 3. Login with any seed data phone number
Phone: +639201111111
OTP: (receive via SMS)

# 4. You're automatically "Bella Garcia" with all services and bookings!
```

### Option B: Fresh Start (Manual Setup)

```bash
# 1. Run SQL script in Supabase
schema.sql

# 2. Start your app
npx expo start

# 3. Login with any phone number
Phone: +639999999999
OTP: (receive via SMS)

# 4. Select role and complete onboarding
Client or Professional → Complete profile
```

---

## Common Issues

### Issue: "Professional logging in as client" or "Duplicate user entries"

**Cause**: Old database trigger is creating basic client profiles before app migration runs

**Fix**: Remove the old trigger and clear migrated data:
```sql
-- Step 1: Remove old trigger (run once)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Step 2: Delete migrated auth user (keeps original seed data)
DELETE FROM auth.users
WHERE phone = '+639201111111'
AND id != 'aaaa1111-aaaa-1111-aaaa-111111111111';

-- Logout from app and login again
```

Or simply run `remove_old_trigger.sql` for step 1.

### Issue: "Need to clear migration and test again"

**Fix**: Delete the migrated auth user and login again:
```sql
-- Delete migrated auth user (keeps original seed data)
DELETE FROM auth.users
WHERE phone = '+639201111111'
AND id != 'aaaa1111-aaaa-1111-aaaa-111111111111';

-- Logout from app and login again
```

### Issue: "UUID conflicts when running seed data"

**Cause**: Seed data was already run

**Fix**:
```sql
-- The seed script uses ON CONFLICT DO UPDATE, so just re-run it
-- Or clear everything and start fresh:
DELETE FROM reviews;
DELETE FROM bookings;
DELETE FROM messages;
DELETE FROM favorites;
DELETE FROM availability;
DELETE FROM services;
DELETE FROM professional_profiles;
DELETE FROM users;
DELETE FROM auth.users WHERE phone IN ('+639201111111', '+639202222222', ...);
```

### Issue: "Bookings or messages not showing for professionals"

**Cause**: Old migration didn't copy bookings/messages correctly

**Fix**: This has been fixed in the latest version. Delete migrated users and login again:
```sql
-- Clear migrated data
DELETE FROM auth.users
WHERE phone = '+639201111111'
AND id != 'aaaa1111-aaaa-1111-aaaa-111111111111';

-- Login again to trigger fresh migration
```

### Issue: "RLS policy errors"

**Cause**: User doesn't have permission to access data

**Fix**: Check that:
1. User is authenticated (has a valid session)
2. RLS policies are set up correctly (run schema.sql)
3. User role matches the policy requirements

---

## Database Diagram

```
auth.users (Supabase Auth)
    ↓
users (App users table)
    ├─→ professional_profiles (has ID different from user_id)
    │      ├─→ services (references professional_profiles.id)
    │      ├─→ availability (references professional_profiles.id)
    │      ├─→ bookings (references professional_profiles.id)
    │      └─→ favorites (references professional_profiles.id)
    │
    ├─→ bookings (as client_id)
    │      ├─→ messages
    │      └─→ reviews
    │
    └─→ reviews (as reviewer/reviewee)
```

**Important**: Note that `bookings.professional_id` references `professional_profiles.id` (NOT `users.id`). The migration handles this correctly by tracking ID mappings.

---

## Files in This Directory

| File | Purpose |
|------|---------|
| `schema.sql` | Complete database structure |
| `seed-demo-data.sql` | Demo data for testing (5 professionals, 3 clients, bookings, messages) |
| `remove_old_trigger.sql` | Removes old auth trigger (run if upgrading) |
| `migrations/` | Database migrations (e.g., typing indicators) |
| `README.md` | This file |

---

## Tips

- Always run `schema.sql` first
- Seed data migration is automatic - just login with seed phone numbers
- Check console logs during login to see migration progress
- To reset testing, delete migrated auth users and login again
- Use seed data phone numbers to test without manual setup
- Check Supabase logs if you see unexpected behavior

---

*Last updated: 2026-01-24*
