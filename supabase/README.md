# BeautyConnect Database Setup

Complete database setup guide for BeautyConnect salon management system.

## File Structure

```
supabase/
├── README.md                                    # This file
└── migrations/
    ├── 20260125_salon_business_support.sql      # Schema + utility functions
    └── 01_seed_data.sql                         # Seed data (business, staff, services, bookings)
```

---

## Quick Setup

### Prerequisites
- Supabase project created
- Access to Supabase SQL Editor

### Setup Steps

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Click "SQL Editor" in the left sidebar

2. **Run Schema Migration** (if not already done)
   ```sql
   -- Copy and paste contents of:
   migrations/20260125_salon_business_support.sql
   ```
   Click "Run" and wait for completion.

   This creates:
   - Database tables (businesses, staff_members, staff_availability, staff_blocked_dates)
   - RLS policies
   - Helper functions
   - Migration utility function

3. **Run Seed Data**
   ```sql
   -- Copy and paste contents of:
   migrations/01_seed_data.sql
   ```
   Click "Run". You should see:
   ```
   ✓ Seed data created successfully!
   - Business: Glam Haven Salon & Spa
   - 5 Staff Members with availability
   - 11 Services across all categories
   - 4 Sample bookings
   ```

---

## What Gets Created

### Business Owner Account
- **Phone:** +639206666666
- **Name:** Gloria Salon Owner
- **Business:** Glam Haven Salon & Spa
- **Type:** Salon
- **Location:** 3rd Floor, SM Mall of Asia, Pasay City, Metro Manila

Login with this account to manage the business, staff, and services.

### Staff Members

| Name | Phone | Specialties | Has Account | Schedule |
|------|-------|-------------|-------------|----------|
| Hannah Lee | +639207777777 | Makeup, Lash | ✓ | Mon-Sat, 10am-7pm |
| Isabel Tan | +639208888888 | Hair | ✓ | Tue-Sun, 11am-8pm |
| Jessica Wong | +639209999999 | Nails, Brow | ✓ | Mon-Sat, 9am-6pm |
| Karen Flores | - | Makeup | ✗ | Wed-Sun, 12pm-9pm |
| Lily Chen | - | Hair, Lash | ✗ | Mon-Fri, 10am-7pm |

**Staff with accounts** can login using their phone numbers and manage their own schedules.

**Staff without accounts** are managed entirely by the business owner.

### Services
- **Makeup:** Bridal Package, Party Glam, Natural Day Makeup
- **Hair:** Korean Color & Style, Treatment & Blow Dry, Haircut & Style
- **Lash:** Volume Extensions, Classic Extensions
- **Nails:** Gel Manicure with Art, Premium Pedicure
- **Brow:** Lamination & Tint

### Sample Bookings
- 4 test bookings with different statuses (pending, confirmed, completed)
- Assigned to various staff members
- Uses existing client users from previous migrations

---

## Database Schema

### Tables Created (Schema Migration)

- `businesses` - Salon/spa business information
- `staff_members` - Staff members working at businesses
- `staff_availability` - Weekly schedules for staff
- `staff_blocked_dates` - Blocked dates (vacations, sick days)

### Utility Functions

- `migrate_business_professional_id()` - Migrates business ownership when seed users login
- `is_staff_available()` - Checks if staff is available at a given time
- `get_available_staff()` - Returns available staff for a service
- `auto_assign_staff()` - Auto-assigns staff to bookings

### Database Relationships

```
auth.users (Supabase Auth)
    ↓
users (App users)
    ↓
professional_profiles
    ↓
businesses (professional_id references professional_profiles.id)
    ↓
staff_members (business_id references businesses.id)
    ├─→ staff_availability (weekly schedules)
    ├─→ staff_blocked_dates (time off)
    ├─→ services (optional staff assignment)
    └─→ bookings (optional staff assignment)
```

---

## How Migration Works

When you login with a staff member's phone number:

1. Supabase creates a new auth user with a random UUID
2. App detects this phone exists in seed data
3. Migration automatically runs (`src/services/auth.ts`)
4. Business and staff data are linked to your new user ID using `migrate_business_professional_id()`

**Benefits:**
- No database triggers needed
- Works in all Supabase environments
- Easy to debug with console logs
- Handles all foreign key relationships

---

## Troubleshooting

### Business owner shows as "Individual Professional"

**Solution:**
1. Make sure both migration files were run successfully
2. The migration function should auto-link the business when you log in
3. Check that the business `professional_id` matches your profile ID:
   ```sql
   SELECT id, professional_id, business_name
   FROM businesses;
   ```

### No staff members showing

**Solution:** Make sure you ran `01_seed_data.sql` which creates the business and all 5 staff members.

### Error: "relation already exists"

**Solution:** The table was already created. This is safe to ignore.

### Error: "column does not exist"

**Solution:** Make sure you ran `20260125_salon_business_support.sql` first.

### Need to reset and test again

**Solution:** Delete the migrated auth user and login again:
```sql
-- Delete migrated auth user (keeps original seed data)
DELETE FROM auth.users
WHERE phone = '+639206666666'
AND id != '1b1a6bad-d484-4ca9-adc8-d9e8486670d4';

-- Logout from app and login again
```

### RLS policy errors

**Fix:** Check that:
1. User is authenticated (has a valid session)
2. RLS policies are set up correctly (run schema migration)
3. User role matches the policy requirements

---

## Notes

- All seed data uses `ON CONFLICT` clauses, so it can be re-run safely
- Staff availability is set with realistic schedules (different days/hours for each staff)
- The migration utility function enables automatic business linking when seed users log in
- Check console logs during login to see migration progress
- Check Supabase logs if you see unexpected behavior

---

*Last updated: 2026-01-30*
