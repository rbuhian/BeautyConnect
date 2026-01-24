# Quick Start Guide

## Problem You're Facing

When you login with seed data phone number `+639201111111`, you're showing as a **client** instead of **professional (Bella Garcia)**.

## Why This Happens

Supabase generates a random UUID when you login via phone auth. The seed data has a different UUID for that phone number, so the app can't find the professional profile.

## The Fix (3 Steps)

### Step 1: Run the Fix Script

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)
2. Open `supabase/fix-seed-data-users.sql`
3. Copy and paste the entire file into the SQL Editor
4. Click **RUN**

You should see:
```
✅ Trigger created successfully!
Now when you login with seed data phone numbers:
  - +639201111111 will be Bella Garcia (Professional)
  ...
```

### Step 2: Delete Your Existing Test User

Since you already logged in, you need to delete the wrong user:

```sql
-- Run this in Supabase SQL Editor:
DELETE FROM auth.users WHERE phone = '+639201111111';
DELETE FROM users WHERE phone = '+639201111111';
```

### Step 3: Login Again

1. Open your app
2. Login with `+639201111111`
3. Enter the OTP you receive via SMS
4. **You'll now be logged in as Bella Garcia (Professional)** with all services, profile, and data!

---

## Verify It Worked

After logging in, you should see:
- ✅ **Professional** navigation (Dashboard, Calendar, Messages, Profile)
- ✅ Name: **Bella Garcia**
- ✅ Services already set up (Bridal Makeup, Evening Glam, etc.)
- ✅ Portfolio photos visible
- ✅ Reviews and ratings

---

## For All Other Seed Data Phone Numbers

The same fix applies to all seed data accounts:

**Professionals**:
- `+639201111111` → Bella Garcia (Makeup, Lash)
- `+639202222222` → Carmen Dela Cruz (Hair)
- `+639203333333` → Diana Mendoza (Nails)
- `+639204444444` → Elena Villanueva (Lash, Brow)
- `+639205555555` → Fatima Ramos (Makeup, Hair, Brow)

**Clients**:
- `+639171234567` → Maria Santos
- `+639182345678` → Ana Reyes
- `+639193456789` → Sofia Cruz

Just login with any of these numbers, and the trigger will automatically migrate the data.

---

## Testing Different Roles

### Test as Professional
```
1. Login: +639201111111
2. Receive OTP via SMS
3. Automatically logged in as Bella Garcia (Professional)
4. Add/edit services, manage bookings, etc.
```

### Test as Client
```
1. Login: +639171234567
2. Receive OTP via SMS
3. Automatically logged in as Maria Santos (Client)
4. Discover professionals, book services, etc.
```

---

## Need Help?

See detailed documentation:
- `supabase/README.md` - Complete database setup guide
- `TESTING_GUIDE.md` - Full testing workflow
- `docs/plans/2026-01-18-implementation-plan.md` - Project roadmap

---

*Last updated: 2026-01-24*
