# Deployment Guide: Typing Indicators Feature

## Overview
This guide explains how to deploy the typing indicators feature to your Supabase database. The feature includes a new `typing_indicators` table, real-time subscriptions, and Row-Level Security (RLS) policies.

## Prerequisites
- Access to your Supabase project
- Appropriate permissions to run SQL migrations

## Deployment Steps

### Option 1: Using Supabase Dashboard (Recommended)

1. **Log in to Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your BeautyConnect project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Migration**
   - Copy the contents of `supabase/migrations/20260122_add_typing_indicators.sql`
   - Paste into the SQL editor
   - Click "Run" button

4. **Verify the Table Was Created**
   - Navigate to "Table Editor" in the left sidebar
   - Look for `typing_indicators` table in the list
   - Click on it to verify columns: `id`, `booking_id`, `user_id`, `started_at`, `expires_at`

### Option 2: Using Supabase CLI

1. **Install Supabase CLI** (if not already installed)
   ```bash
   npm install -g supabase
   ```

2. **Link Your Project**
   ```bash
   cd beautyconnect
   supabase link --project-ref [your-project-ref]
   ```

3. **Run the Migration**
   ```bash
   supabase db push
   ```

### Option 3: Manual Table Creation

If the above options don't work, you can manually create the table:

1. **Create the Table** - Run this in SQL Editor:
   ```sql
   CREATE TABLE typing_indicators (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 seconds'),
     UNIQUE(booking_id, user_id)
   );
   ```

2. **Create Indexes**:
   ```sql
   CREATE INDEX idx_typing_indicators_booking_id ON typing_indicators(booking_id);
   CREATE INDEX idx_typing_indicators_user_id ON typing_indicators(user_id);
   ```

3. **Enable RLS**:
   ```sql
   ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
   ```

4. **Create RLS Policies** - Copy all CREATE POLICY statements from the migration file

## Verification

After deployment, verify that:

1. ✅ Table exists: `typing_indicators`
2. ✅ Columns exist: `id`, `booking_id`, `user_id`, `started_at`, `expires_at`
3. ✅ Indexes are created (check under "Indexes" tab in Table Editor)
4. ✅ RLS is enabled (check under "Authentication" → "Policies")
5. ✅ 4 RLS policies are created:
   - "Booking participants can view typing indicators"
   - "Booking participants can start typing"
   - "Users can update own typing status"
   - "Users can delete own typing status"

## Testing

After deployment, test the feature:

1. Open the app and navigate to a chat
2. Start typing - you should see the typing indicator UI
3. Open the chat on another device/user and you should see the other person typing
4. Stop typing - the indicator should disappear after 3 seconds of inactivity
5. Check Supabase logs for any errors in the SQL operations

## Troubleshooting

### Error: "Could not find the table 'public.typing_indicators'"
**Solution**: The table hasn't been created yet. Follow the deployment steps above.

### Error: "invalid input syntax for type uuid"
**Solution**: Ensure the `bookingId` is being passed correctly from the navigation. The app has been updated with validation to prevent this.

### Error: "PGRST205" or permission denied
**Solution**: Verify that:
1. RLS policies are correctly created
2. Your user is authenticated
3. You have access to the booking (client or professional)

## Rollback

If you need to remove the feature:

```sql
-- Drop the table (this will remove all typing indicator data)
DROP TABLE typing_indicators;
```

## Performance Notes

- Typing indicators auto-expire after 30 seconds (prevents stale data)
- The app stops sending typing indicators after 3 seconds of inactivity
- Indexes on `booking_id` and `user_id` ensure fast queries
- RLS policies ensure users can only see relevant typing indicators

## Real-time Subscriptions

The app uses Supabase's Postgres Changes to listen for real-time updates:

- Subscribe to: `typing:${bookingId}` channel
- Receives updates when users start/stop typing
- Automatically unsubscribes when leaving the chat screen
- Properly cleans up on component unmount

## Support

If you encounter issues:
1. Check Supabase dashboard logs
2. Review the migration file syntax
3. Ensure all foreign keys reference existing tables (bookings, users)
4. Verify your Supabase project URL and API keys in `.env`
