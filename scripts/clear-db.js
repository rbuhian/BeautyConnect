#!/usr/bin/env node
/**
 * Clear Database Script
 * ---------------------
 * Deletes all rows from every app table and removes all auth users.
 * Requires the Supabase SERVICE ROLE key (not the anon key).
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/clear-db.js
 *
 * Or add SUPABASE_SERVICE_ROLE_KEY to your .env and run:
 *   node -r dotenv/config scripts/clear-db.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing env vars. Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Tables in deletion order (children before parents)
const TABLES = [
  'promotion_uses',
  'package_services',
  'ad_impressions',
  'ad_clicks',
  'staff_blocked_dates',
  'staff_availability',
  'messages',
  'reviews',
  'favorites',
  'user_reports',
  'user_blocks',
  'professional_verifications',
  'staff_members',
  'businesses',
  'bookings',
  'availability',
  'professional_blocked_dates',
  'scheduling_rules',
  'service_packages',
  'promotions',
  'featured_listings',
  'services',
  'ad_creatives',
  'affiliate_products',
  'professional_profiles',
  'users',
];

async function clearTable(table) {
  const { error, count } = await supabase
    .from(table)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // matches all rows
    .select('id', { count: 'exact', head: true });

  if (error) {
    console.error(`  ✗ ${table}: ${error.message}`);
    return false;
  }
  console.log(`  ✓ ${table}`);
  return true;
}

async function clearAuthUsers() {
  // List all auth users and delete them
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    console.error(`  ✗ auth.users: ${error.message}`);
    return;
  }

  const users = data?.users ?? [];
  if (users.length === 0) {
    console.log('  ✓ auth.users (already empty)');
    return;
  }

  let deleted = 0;
  for (const user of users) {
    const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.error(`  ✗ auth user ${user.email}: ${delErr.message}`);
    } else {
      deleted++;
    }
  }
  console.log(`  ✓ auth.users (${deleted}/${users.length} deleted)`);
}

async function main() {
  console.log('Clearing database...\n');

  console.log('App tables:');
  for (const table of TABLES) {
    await clearTable(table);
  }

  console.log('\nAuth users:');
  await clearAuthUsers();

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
