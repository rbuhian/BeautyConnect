-- Remove old trigger that conflicts with app-level seed data migration
-- Run this once to clean up existing databases

-- Drop the old trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the old function
DROP FUNCTION IF EXISTS handle_new_user();

-- Confirm
SELECT '✅ Old trigger and function removed successfully!' as message;
SELECT 'User profile creation is now handled at the app level (src/services/auth.ts)' as info;
