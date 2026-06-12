# BeautyConnect - Feature Roadmap

A comprehensive plan for additional features to enhance the BeautyConnect platform.

---

## Current State Summary

BeautyConnect is a React Native (Expo SDK 54) marketplace connecting beauty professionals with clients in the Philippines. The app currently supports:

- **3 user roles:** Client, Professional, Admin
- **40 completed features** including: email OTP auth (email as username, OTP delivered via email), booking flow, real-time chat, reviews, push notifications, payment processing (PayMongo), featured listings, ad system, staff management, geolocation sorting, payment dashboards, client CRM, revenue analytics, scheduling rules, service packages, and promotions & discounts
- **189 automated tests** across 8 test suites
- **20+ database tables** with Row-Level Security

---

## Phase 1: Client Experience Enhancements

### 1.1 Loyalty & Rewards Program
**Priority:** High | **Category:** Backend + UI | **Estimated:** 16 hrs

Encourage repeat bookings by rewarding loyal clients.

**Features:**
- Earn points per completed booking (1 point per PHP 100 spent)
- Loyalty tiers: Bronze (0-499), Silver (500-1499), Gold (1500+)
- Redeem points for discounts on future bookings
- Professional-specific stamp cards (e.g., "Book 5 haircuts, get 1 free")
- Points history and balance display on Profile

**Database:**
- `loyalty_points` - user_id, points_balance, lifetime_points, tier
- `loyalty_transactions` - user_id, booking_id, points, type (earned/redeemed), created_at
- `stamp_cards` - user_id, professional_id, service_category, stamps_collected, stamps_required, reward_description

**Screens:**
- `LoyaltyScreen` - Points balance, tier progress, stamp cards, redemption history
- Booking confirmation shows points earned

---

### 1.2 Rebooking & Booking Templates
**Priority:** High | **Category:** UI | **Estimated:** 8 hrs

Make repeat bookings effortless.

**Features:**
- "Book Again" button on completed bookings (pre-fills service, professional, location)
- Save booking preferences as templates ("My usual haircut with Bella")
- Quick-book from favorites list with last service pre-selected
- Suggested rebooking reminders (e.g., "It's been 4 weeks since your last haircut")

**Database:**
- `booking_templates` - user_id, professional_id, service_id, location_type, client_address, label

---

### 1.3 Service Packages & Bundles ✅ IMPLEMENTED
**Priority:** Medium | **Category:** Backend + UI | **Estimated:** 12 hrs | **Status:** Done

Allow professionals to offer bundled services at discounted prices.

**Implemented:**
- Professionals create packages from existing services (e.g., "Bridal Package: Hair + Makeup + Nails")
- Package pricing with auto-calculated discount percentage
- ManagePackagesScreen with list, edit, delete, active/inactive toggle
- CreatePackageScreen with multi-select services, live preview, auto discount calculation
- Packages tab on client ProfessionalProfileScreen showing package cards with discount badges
- Book Package button (MVP: books at package price using total duration for time slot)
- Horizontal scrollable tabs to prevent layout distortion with 4+ tabs

**Files:**
- `supabase/migrations/20260221_service_packages.sql` - DB migration with RLS policies
- `src/services/packages.ts` - `getPackages`, `createPackage`, `updatePackage`, `deletePackage`, `getActivePackages`
- `src/screens/professional/ManagePackagesScreen.tsx` - Package list management
- `src/screens/professional/CreatePackageScreen.tsx` - Create/edit package form
- `src/screens/client/ProfessionalProfileScreen.tsx` - Added Packages tab
- `src/types/index.ts` - `ServicePackage`, `PackageService` interfaces
- Accessible via: Professional Profile → Service Packages; Client → Professional Profile → Packages tab

**Database:**
- `service_packages` - id, professional_id, name, description, total_price, discount_pct, is_active
- `package_services` - package_id, service_id, sort_order (with unique constraint)

**Future enhancements (not yet implemented):**
- Full multi-slot package booking (separate time slot per service)
- Package booking creates linked bookings for each included service
- Package analytics in Revenue Analytics screen

---

### 1.4 Waitlist / Cancellation Alerts
**Priority:** Medium | **Category:** Backend | **Estimated:** 8 hrs

Fill cancelled slots and reduce no-shows.

**Features:**
- Clients can join a waitlist for fully-booked professionals on specific dates
- When a booking is cancelled, waitlisted clients get notified
- First-come-first-served or priority-based (loyalty tier) slot offering
- Auto-expire waitlist entries after the date passes

**Database:**
- `waitlist` - id, client_id, professional_id, preferred_date, service_id, status (waiting/offered/booked/expired), created_at

---

### 1.5 Before & After Gallery
**Priority:** Medium | **Category:** UI | **Estimated:** 10 hrs

Showcase transformation results to attract new clients.

**Features:**
- Professionals upload before/after photo pairs tagged by service category
- Swipeable comparison slider on professional profile
- Clients can browse gallery filtered by category
- Featured transformations on Discover feed
- Client can opt-in to share their transformation (with consent)

**Database:**
- `transformations` - id, professional_id, service_category, before_photo, after_photo, description, client_consent, is_featured, created_at

---

## Phase 2: Professional Growth Tools

### 2.1 Client Management (CRM) ✅ IMPLEMENTED
**Priority:** High | **Category:** Backend + UI | **Estimated:** 16 hrs | **Status:** Done

Help professionals track and manage their client relationships.

**Implemented:**
- Client list with booking history per client (grouped from bookings table)
- Search clients by name
- Summary cards: Total Clients, Total Revenue, Repeat Rate
- Expandable client detail with stats (completed/cancelled counts, avg booking value, avg rating)
- Recent booking history per client (tap to view booking detail)
- Favorite service detection per client
- View total revenue per client
- Last visit date display

**Files:**
- `src/services/client-management.ts` - `getClientList`, `getClientBookingHistory`, `getClientStats`
- `src/screens/professional/ClientManagementScreen.tsx` - Full CRM screen
- Accessible via: Profile → My Clients

**Future enhancements (not yet implemented):**
- Private notes per client (requires `client_notes` table)
- Tag clients (VIP, regular, new) (requires `client_tags` table)
- Client birthday tracking with reminder notifications

---

### 2.2 Promotions & Discounts ✅ IMPLEMENTED
**Priority:** High | **Category:** Backend + UI | **Estimated:** 12 hrs | **Status:** Done

Enable professionals to run time-limited promotions.

**Implemented:**
- Professionals create discount codes (percentage or fixed amount) with custom title, description, dates, max uses, min order value
- Auto-uppercase code generator with copy-to-clipboard on client profile
- ManagePromotionsScreen with status badges (Active / Scheduled / Expired / Inactive), usage count, toggle active switch
- CreatePromotionScreen with live preview card, date range, percentage/fixed type selector
- Promotion banners on client ProfessionalProfileScreen (dashed card with discount + code + "Valid until"); tap code to copy (2-second "Copied!" flash)
- Promo code input on BookingFlowScreen summary step — validates code, shows discount, updates final price and deposit amount
- `recordPromotionUse` called after booking created; atomically increments `uses_count` via RPC
- Admin can create and manage platform-wide promotions (professional_id IS NULL) — entry via Ads Dashboard → Manage Platform Promotions

**Files:**
- `supabase/migrations/20260221_promotions.sql` - DB migration with RLS policies
- `src/services/promotions.ts` - Full CRUD + `validatePromoCode`, `recordPromotionUse`, `getActivePromotions`, `getPlatformPromotions`, `createPlatformPromotion`
- `src/screens/professional/ManagePromotionsScreen.tsx` - List with status, toggle, edit, delete
- `src/screens/professional/CreatePromotionScreen.tsx` - Create/edit form with live preview
- `src/screens/admin/AdminManagePromotionsScreen.tsx` - Platform-wide promotion list
- `src/screens/admin/AdminCreatePromotionScreen.tsx` - Platform-wide promotion form
- `src/screens/client/ProfessionalProfileScreen.tsx` - Promotion banners with tap-to-copy
- `src/screens/client/BookingFlowScreen.tsx` - Promo code input on summary step
- `src/screens/admin/AdsDashboardScreen.tsx` - "Manage Platform Promotions" quick action
- `src/types/index.ts` - `Promotion`, `PromotionUse`, `DiscountType` types
- Accessible via: Professional Profile → Promotions & Discounts; Client → Professional Profile banners + Booking Checkout; Admin → Ads Dashboard → Manage Platform Promotions

**Database:**
- `promotions` - id, professional_id (NULL = platform-wide), code, title, description, discount_type ('percentage'|'fixed'), discount_value, min_order_value, max_uses, uses_count, is_active, starts_at, ends_at
- `promotion_uses` - promotion_id, booking_id, client_id, discount_applied, UNIQUE(promotion_id, booking_id)

**Future enhancements (not yet implemented):**
- First-time client discounts (requires tracking first-booking per professional)
- Referral discounts (see 3.2 Referral Program)
- Promotion analytics (usage over time, revenue impact)

---

### 2.3 Portfolio Enhancement
**Priority:** Medium | **Category:** UI | **Estimated:** 8 hrs

Richer portfolio presentation for professionals.

**Features:**
- Video uploads (short clips of work, up to 30 seconds)
- Categorize portfolio by service type
- Pin best work to top of portfolio
- Client testimonial highlights with photo
- Portfolio view count analytics

**Database:**
- `portfolio_items` - id, professional_id, type (photo/video), url, thumbnail_url, category, caption, is_pinned, view_count, created_at

---

### 2.4 Automated Scheduling Rules ✅ IMPLEMENTED
**Priority:** Medium | **Category:** Backend | **Estimated:** 10 hrs | **Status:** Done

Smarter scheduling for busy professionals.

**Implemented:**
- Buffer time between appointments (0–60 min, step 5)
- Lunch break blocking with start/end time pickers
- Travel time buffer for home service bookings (shown only for home_service/both)
- Maximum bookings per day limit (toggle + stepper)
- Minimum advance booking notice (1–72 hours)
- Rules saved to database via upsert

**Files:**
- `src/services/scheduling-rules.ts` - `getSchedulingRules`, `upsertSchedulingRules`
- `src/screens/professional/SchedulingRulesScreen.tsx` - Config screen with steppers and toggles
- `src/types/index.ts` - `SchedulingRules` interface
- `supabase/migrations/20260221_scheduling_rules.sql` - DB migration
- Accessible via: Profile → Scheduling Rules

**Database:**
- `scheduling_rules` - professional_id, buffer_minutes, max_daily_bookings, lunch_break_enabled, lunch_start_time, lunch_end_time, travel_buffer_minutes, min_advance_booking_hours

**Future enhancements (not yet implemented):**
- Enforce rules during booking flow (block unavailable time slots)
- Auto-decline when fully booked
- Recurring blocked dates (requires `recurring_blocks` table)

---

### 2.5 Revenue Analytics & Insights ✅ IMPLEMENTED
**Priority:** Medium | **Category:** UI | **Estimated:** 10 hrs | **Status:** Done

Deeper business intelligence for professionals.

**Implemented:**
- Time period filtering (This Month / Last 3 Months / All Time)
- Summary cards: Total Revenue, Avg per Booking, Total Bookings
- Revenue by Category — horizontal bar chart with color-coded categories
- Top Services — ranked list with revenue bars and avg price
- Peak Hours — vertical bar chart showing booking frequency per hour (6am–10pm)
- Client Retention — retention rate %, repeat vs total clients, avg visits per client
- Pull-to-refresh support

**Files:**
- `src/services/payments-analytics.ts` - Added `getRevenueByCategory`, `getRevenueByService`, `getPeakHoursAnalysis`, `getRetentionMetrics` + types
- `src/screens/professional/RevenueAnalyticsScreen.tsx` - Full analytics dashboard
- Accessible via: Profile → Revenue Analytics

**Future enhancements (not yet implemented):**
- Revenue comparison (this month vs last month)
- Export reports as PDF

---

## Phase 3: Platform & Social Features

### 3.1 In-App Stories / Feed
**Priority:** Medium | **Category:** UI | **Estimated:** 14 hrs

Instagram-like stories for professionals to showcase daily work.

**Features:**
- Professionals post stories (photos/short videos) visible for 24 hours
- Stories appear at top of Discover screen in circular avatars
- Tap to view story with progress bar
- Clients can react or message from story
- Story analytics (views, taps)

**Database:**
- `stories` - id, professional_id, media_url, media_type, caption, expires_at, created_at
- `story_views` - story_id, user_id, viewed_at

**Screens:**
- `StoryViewerScreen` - Full-screen story viewer with progress
- `CreateStoryScreen` - Camera/gallery picker with caption

---

### 3.2 Referral Program
**Priority:** High | **Category:** Backend | **Estimated:** 10 hrs

Grow the platform through word-of-mouth.

**Features:**
- Each user gets a unique referral code
- Share referral link via SMS, social media, or in-app
- Referrer gets reward (points or discount) when referred user completes first booking
- Referred user gets first-booking discount
- Referral leaderboard for top referrers
- Professional referral program (refer other professionals)

**Database:**
- `referrals` - id, referrer_id, referred_id, referral_code, status (pending/completed), reward_given, created_at
- Add `referral_code` column to `users` table

---

### 3.3 Multi-Language Support (i18n)
**Priority:** Medium | **Category:** UI | **Estimated:** 12 hrs

Serve the diverse Philippine market.

**Features:**
- Support for English and Filipino (Tagalog)
- Language selector in Settings
- All UI strings externalized to translation files
- Professional profiles can have bilingual descriptions
- Auto-detect device language

**Implementation:**
- Use `i18next` + `react-i18next` library
- Translation files: `en.json`, `fil.json`
- Store preference in AsyncStorage

---

### 3.4 Map View for Discover
**Priority:** Medium | **Category:** UI | **Estimated:** 10 hrs

Visual geographic discovery of nearby professionals.

**Features:**
- Toggle between list view and map view on Discover
- Professional pins on map with preview card on tap
- Cluster markers when zoomed out
- "Search this area" button when map moves
- Filter by distance radius
- Show salon addresses and home service coverage areas

**Implementation:**
- Use `react-native-maps` with Google Maps
- Professionals with coordinates shown on map
- Salon locations as pins, home service as radius circles

---

### 3.5 Group Bookings
**Priority:** Low | **Category:** Backend + UI | **Estimated:** 14 hrs

Book services for multiple people at once.

**Features:**
- Book for a group (e.g., bridal party, family)
- Specify number of people and services per person
- Professional sees full group booking details
- Group pricing (potential discount for 3+ people)
- Shared booking chat for the group organizer

**Database:**
- `group_bookings` - id, organizer_id, professional_id, date, total_people, total_price, status
- `group_booking_members` - group_booking_id, member_name, service_id, time_slot

---

## Phase 4: Trust & Safety

### ~~4.1 Identity Verification~~ ✅ DONE
**Priority:** High | **Category:** Backend | **Estimated:** 12 hrs | **Actual:** 10 hrs

Build trust with verified professionals.

**Features:**
- ✅ Government ID upload and verification
- ✅ Verified badge on professional profile, cards, and client-facing views
- ✅ Certificate/license upload (e.g., cosmetology license)
- ✅ Admin review and approval workflow
- ✅ Verification status: pending, verified, rejected

**Database:**
- ✅ `professional_verifications` — id, professional_id, status, id_document_path, certificate_paths, submission_notes, admin_notes, submitted_at, reviewed_at, reviewed_by
- ✅ `professional_profiles` — added `verification_status`, `is_verified` columns
- ✅ Private `verifications` storage bucket with RLS (signed URLs for access)

**Screens:**
- ✅ `VerificationScreen` (Professional) — Upload documents, track status, resubmit after rejection
- ✅ `AdminVerificationDetailScreen` (Admin) — Review docs, approve/reject with notes
- ✅ `AdminUsersScreen` — New "Verifications" tab with pending count badge

---

### 4.2 Dispute Resolution
**Priority:** Medium | **Category:** Backend + UI | **Estimated:** 10 hrs

Handle complaints and disputes fairly.

**Features:**
- Client or professional can open a dispute on a booking
- Dispute categories: no-show, poor quality, wrong service, overcharge
- Photo evidence upload
- Admin mediation workflow
- Resolution options: refund, partial refund, dismiss
- Dispute history and status tracking

**Database:**
- `disputes` - id, booking_id, reporter_id, category, description, evidence_urls[], status (open/under_review/resolved/dismissed), resolution, admin_notes, created_at, resolved_at

---

### 4.3 Cancellation Policy Management
**Priority:** Medium | **Category:** Backend | **Estimated:** 6 hrs

Let professionals set and enforce their own cancellation policies.

**Features:**
- Professional sets cancellation window (e.g., 24 hours before)
- Late cancellation fee (percentage of service price)
- Free cancellation period
- Policy displayed during booking
- Auto-apply fees on late cancellations
- No-show tracking and penalties

**Database:**
- `cancellation_policies` - professional_id, free_cancel_hours, late_cancel_fee_pct, no_show_fee_pct

---

### ~~4.4 Report & Block Users~~ ✅ DONE
**Priority:** Medium | **Category:** Backend + UI | **Estimated:** 6 hrs | **Actual:** 5 hrs

Safety tools for both clients and professionals.

**Implemented:**
- ✅ Bidirectional blocking: clients block/unblock professionals (from `⋯` in ProfessionalProfileScreen header); professionals block/unblock clients (from expanded row in ClientManagementScreen)
- ✅ Blocked professionals filtered out of Discover on next load (`getBlockedUserIds` → `NOT IN` query)
- ✅ Reason-based report modal with 7 categories: Harassment, Inappropriate Content, Fraud, Unsafe Practices, No-Show, Spam, Other + optional details text
- ✅ Admin review queue: 4th "Reports" tab in AdminUsersScreen with red pending-count badge
- ✅ Auto-flag chip shown when reported user has ≥ 3 total reports
- ✅ Admin can Dismiss or Take Action (mark actioned only, or action + suspend user)
- ✅ Fixed RLS: `reporter_id` and `blocker_id` set explicitly in INSERT payloads

**Files:**
- `supabase/migrations/20260222_report_block.sql` — `user_blocks` + `user_reports` tables with RLS
- `src/services/reports.ts` — `blockUser`, `unblockUser`, `isUserBlocked`, `getBlockedUserIds`, `submitReport`
- `src/screens/admin/AdminReportDetailScreen.tsx` — Reporter/reported cards, reason, notes, dismiss/action buttons
- `src/services/admin.ts` — Added `getPendingReports`, `getReportDetail`, `reviewReport`, `ReportListItem`, `ReportDetail`
- `src/services/client.ts` — `getDiscoverProfessionals` accepts optional `blockedUserIds` param
- `src/screens/client/DiscoverScreen.tsx` — Fetches blocked IDs before discover query
- `src/screens/client/ProfessionalProfileScreen.tsx` — `⋯` header button, block/report bottom-sheet modals
- `src/screens/professional/ClientManagementScreen.tsx` — Block/unblock row in expanded client card
- `src/screens/admin/AdminUsersScreen.tsx` — 4th "Reports" tab with badge; fixed tab bar wrapping (solid primary active, `adjustsFontSizeToFit`)
- `src/navigation/types.ts` — Added `AdminReportDetail: { reportId: string }`
- `src/navigation/AdminNavigator.tsx` — Registered `AdminReportDetailScreen`
- `src/types/index.ts` — Added `ReportReason`, `ReportStatus`, `UserReport`, `UserBlock`

**Database:**
- `user_blocks` — blocker_id, blocked_id, UNIQUE(blocker_id, blocked_id), RLS: users manage own blocks
- `user_reports` — reporter_id, reported_user_id, reason (CHECK), details, status (CHECK), admin_notes, reviewed_by, reviewed_at

---

## Phase 5: Advanced Monetization

### 5.1 Subscription Plans for Professionals
**Priority:** High | **Category:** Backend | **Estimated:** 14 hrs

Recurring revenue model for the platform.

**Features:**
- Free tier: Basic profile, limited bookings/month
- Pro tier (PHP 499/mo): Unlimited bookings, analytics, priority support
- Premium tier (PHP 999/mo): Everything in Pro + featured placement, reduced commission
- Trial period (14 days free)
- Auto-renewal with PayMongo recurring payments

**Database:**
- `subscriptions` - id, professional_id, plan (free/pro/premium), status, starts_at, ends_at, paymongo_subscription_id
- `subscription_plans` - id, name, price, features[], booking_limit

---

### 5.2 Commission System
**Priority:** High | **Category:** Backend | **Estimated:** 10 hrs

Platform takes a percentage of each booking.

**Features:**
- Configurable commission rate per tier (e.g., Free: 15%, Pro: 10%, Premium: 5%)
- Commission calculated on completed bookings
- Commission deducted from professional payouts
- Transparent commission breakdown in payment dashboard
- Admin dashboard shows total commission revenue

**Database:**
- `commissions` - id, booking_id, professional_id, gross_amount, commission_rate, commission_amount, net_amount, created_at

---

### 5.3 Multi-Currency Support
**Priority:** Medium | **Category:** Backend + UI | **Estimated:** 10 hrs

Allow users to view prices and pay in their preferred currency, targeting OFW clients and foreign tourists booking services in the Philippines.

**Features:**
- Supported currencies: PHP (default), USD, EUR, SGD, AED, GBP, JPY, AUD
- User selects preferred display currency in Settings (stored per user)
- All prices displayed in selected currency using live exchange rates
- Exchange rates fetched and cached daily (e.g., via ExchangeRate-API or Open Exchange Rates)
- Payments still processed in PHP via PayMongo; display currency is cosmetic conversion
- Professional prices always stored in PHP; conversion applied at display time
- Admin dashboard revenue figures switchable between PHP and USD
- Currency selector chip on Discover/Booking screens for quick switching

**Implementation:**
- `src/services/currency.ts` — `fetchExchangeRates`, `convertPrice`, `formatCurrency(amount, currency)`
- Cache rates in AsyncStorage with 24-hour TTL
- `CurrencyContext` — provides `selectedCurrency`, `setSelectedCurrency`, `convert(phpAmount)`
- Wrap app in `CurrencyProvider`; all price display components consume context
- Settings screen: currency picker row
- `formatCurrency` handles locale-appropriate symbols and decimal conventions

**Database:**
- Add `preferred_currency` column (VARCHAR 3, default `'PHP'`) to `users` table
- `exchange_rates` table (optional server-side cache): id, base (`PHP`), rates JSONB, fetched_at

---

### 5.4 Gift Cards & Vouchers
**Priority:** Medium | **Category:** Backend + UI | **Estimated:** 10 hrs

Enable gifting of beauty services.

**Features:**
- Purchase digital gift cards (fixed amounts: PHP 500, 1000, 2000, 5000)
- Custom amount gift cards
- Send via email or in-app
- Recipient redeems during booking checkout
- Gift card balance tracking
- Expiry date (1 year from purchase)

**Database:**
- `gift_cards` - id, purchaser_id, recipient_email, amount, balance, code, expires_at, status, created_at

---

## Phase 6: Operations & Scalability

### 6.1 Professional Payout System
**Priority:** Critical | **Category:** Backend | **Estimated:** 16 hrs

Automate payments to professionals.

**Features:**
- Weekly/bi-weekly automatic payouts
- Professional sets payout method (bank transfer, GCash, PayMaya)
- Minimum payout threshold (PHP 500)
- Payout history with downloadable receipts
- Hold period (3 days after booking completion)
- Admin can manually trigger or hold payouts

**Database:**
- `payout_methods` - id, professional_id, type (bank/gcash/paymaya), account_details (encrypted), is_default
- `payouts` - id, professional_id, amount, fee, net_amount, status (pending/processing/completed/failed), payout_method_id, period_start, period_end, created_at

---

### 6.2 Email & SMS Booking Confirmations
**Priority:** Medium | **Category:** Backend | **Estimated:** 6 hrs

Reach users who may miss push notifications. Email is the primary channel (aligned with email-based auth); SMS is a secondary fallback.

**Features:**
- Email confirmation when booking is created (primary)
- Email reminder 24 hours before appointment
- Email notification when professional confirms/declines
- Optional SMS fallback for users who opt in (via Semaphore or Twilio)
- Configurable notification preferences in Settings (email on/off, SMS on/off)

---

### 6.3 Offline Mode
**Priority:** Low | **Category:** Backend | **Estimated:** 14 hrs

Basic app functionality without internet.

**Features:**
- Cache recent bookings, conversations, and professional profiles
- Queue messages for sending when online
- Show offline indicator
- Sync when connection restored
- View upcoming bookings and professional contact info offline

**Implementation:**
- Use AsyncStorage + SQLite for local cache
- Background sync with Supabase when online

---

### 6.4 Multi-Platform (iOS)
**Priority:** High | **Category:** DevOps | **Estimated:** 8 hrs

Expand to iOS market.

**Features:**
- iOS build configuration with EAS
- Apple Push Notification Service (APNs) setup
- App Store submission preparation
- iOS-specific UI adjustments (safe areas, gestures)
- TestFlight for beta testing

**Implementation:**
- Add iOS profile to `eas.json`
- Configure APNs credentials
- Apple Developer Account required ($99/year)

---

## Phase 7: Core Infrastructure

### 7.1 Email-Based Authentication ✅ IMPLEMENTED
**Priority:** Critical | **Category:** Backend + UI | **Estimated:** 4 hrs | **Status:** Done

Replace phone number + SMS OTP with email + email OTP for account creation and login.

**Implemented:**
- Email input screen replaces phone number screen (no more +63 formatting)
- OTP delivered via Supabase email provider (zero SMS cost)
- Email regex validation instead of 10-digit phone validation
- `users.email` column replaces `users.phone` in database
- `verifyOtp` uses `type: 'email'` instead of `type: 'sms'`
- All profile/settings displays updated from phone → email
- Masked email display on OTP screen (e.g. `k***@gmail.com`)

**Files:**
- `supabase/migrations/20260228_email_auth.sql` - Add `email` col, drop `phone` col
- `src/screens/auth/EmailInputScreen.tsx` - Replaces PhoneInputScreen
- `src/screens/auth/OtpVerificationScreen.tsx` - Uses email param + email OTP type
- `src/services/auth.ts` - `signInWithEmail`, `verifyOtp` with `type: 'email'`
- `src/stores/authStore.ts` - `sendOtp(email)`, `verifyOtp(email, token)`
- `src/navigation/types.ts` - `EmailInput` route, `OtpVerification: { email }`
- `src/navigation/AuthNavigator.tsx` - Updated imports/screen names
- `src/types/index.ts` - `email: string` replaces `phone: string` in User

---

## Implementation Priority Matrix

| Priority | Feature | Phase | Est. Hours |
|----------|---------|-------|------------|
| Critical | Professional Payout System | 6 | 16 |
| High | Loyalty & Rewards Program | 1 | 16 |
| ~~High~~ | ~~Client Management (CRM)~~ ✅ | 2 | 16 |
| High | Rebooking & Templates | 1 | 8 |
| ~~High~~ | ~~Promotions & Discounts~~ ✅ | 2 | 12 |
| High | Identity Verification | 4 | 12 |
| High | Subscription Plans | 5 | 14 |
| High | Commission System | 5 | 10 |
| High | Referral Program | 3 | 10 |
| High | Multi-Platform (iOS) | 6 | 8 |
| ~~Medium~~ | ~~Service Packages~~ ✅ | 1 | 12 |
| Medium | Before & After Gallery | 1 | 10 |
| Medium | Waitlist / Cancellation Alerts | 1 | 8 |
| ~~Medium~~ | ~~Revenue Analytics~~ ✅ | 2 | 10 |
| Medium | Portfolio Enhancement | 2 | 8 |
| ~~Medium~~ | ~~Automated Scheduling~~ ✅ | 2 | 10 |
| Medium | Map View for Discover | 3 | 10 |
| Medium | Multi-Language (i18n) | 3 | 12 |
| Medium | Dispute Resolution | 4 | 10 |
| Medium | Cancellation Policy | 4 | 6 |
| ~~Medium~~ | ~~Report & Block~~ ✅ | 4 | 6 |
| Medium | Multi-Currency Support | 5 | 10 |
| Medium | Gift Cards & Vouchers | 5 | 10 |
| Medium | Email & SMS Confirmations | 6 | 6 |
| Medium | In-App Stories | 3 | 14 |
| Low | Group Bookings | 3 | 14 |
| Low | Offline Mode | 6 | 14 |
| ~~Critical~~ | ~~Email-Based Authentication~~ ✅ | 7 | 4 |

**Total estimated: ~322 hours across 28 features (8 completed = ~75 hrs done, ~247 hrs remaining)**

---

## Recommended Implementation Order

### Sprint 1 (Immediate - Revenue Critical)
1. Professional Payout System
2. Commission System
3. Rebooking & Templates

### Sprint 2 (Growth & Retention)
4. Loyalty & Rewards Program
5. Referral Program
6. ~~Promotions & Discounts~~ ✅

### Sprint 3 (Professional Tools) ✅ COMPLETE
7. ~~Client Management (CRM)~~ ✅
8. ~~Revenue Analytics & Insights~~ ✅
9. ~~Automated Scheduling Rules~~ ✅

### Sprint 4 (Trust & Safety)
10. Identity Verification
11. Cancellation Policy Management
12. ~~Report & Block Users~~ ✅

### Sprint 5 (Platform Expansion)
13. Multi-Platform (iOS)
14. Subscription Plans
15. Multi-Currency Support
16. ~~Service Packages & Bundles~~ ✅ (completed early)

### Sprint 6 (Engagement & Discovery)
16. Before & After Gallery
17. Map View for Discover
18. In-App Stories

### Sprint 7 (Polish & Scale)
19. Multi-Language Support
20. Email & SMS Confirmations
21. Waitlist / Cancellation Alerts
22. Dispute Resolution
23. Gift Cards & Vouchers
