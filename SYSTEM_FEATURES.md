# BeautyConnect - System Features Documentation

## Overview

BeautyConnect is a mobile application built with React Native (Expo SDK 54) that connects beauty service seekers (clients) with beauty professionals and salon/spa businesses in the Philippines. The platform supports booking, messaging, reviews, and full business management.

**Tech Stack:** React Native, Expo, TypeScript, Supabase (PostgreSQL, Auth, Storage, Realtime), Zustand, React Navigation

---

## Table of Contents

1. [Authentication & Onboarding](#1-authentication--onboarding)
2. [Client Features](#2-client-features)
3. [Professional Features](#3-professional-features)
4. [Salon/Spa Business Features](#4-salonspa-business-features)
5. [Booking System](#5-booking-system)
6. [Messaging System](#6-messaging-system)
7. [Review & Rating System](#7-review--rating-system)
8. [Notification System](#8-notification-system)
9. [Calendar & Scheduling](#9-calendar--scheduling)
10. [Media & Storage](#10-media--storage)
11. [Navigation & UI](#11-navigation--ui)
12. [Data Models](#12-data-models)
13. [Configuration & Constants](#13-configuration--constants)

---

## 1. Authentication & Onboarding

### Phone-Based Authentication
- OTP (One-Time Password) login via phone number
- Philippine phone format support (+63)
- Supabase Auth integration for secure session management
- Automatic session persistence and refresh
- Development mode bypass for testing

### Role Selection
- Users choose between **Client** or **Professional** role after first login
- Role determines which navigator and features are available

### Client Onboarding
- Name input
- Avatar photo upload
- Location/address input

### Professional Onboarding
- Name and bio input (50-500 characters)
- Category selection: Makeup, Hair, Nails, Lash, Brow (multi-select)
- Portfolio photo uploads (minimum 3, maximum 10)
- Location type: Home Service, Salon, or Both
- Service area description
- Automatic default availability schedule created on signup

### Seed Data Migration
- Automatic migration of demo/test data to new authenticated users
- Transfers professional profiles, services, availability, bookings, messages, reviews, and favorites
- Supports both individual professionals and salon businesses with staff

---

## 2. Client Features

### Discover Professionals
- Browse all live beauty professionals
- Sorted by rating (highest first)
- Horizontal scrolling professional cards with:
  - Avatar, name, rating, review count
  - Categories (badges)
  - Price range indicator
  - Location type
  - Favorite toggle (heart icon)
- Search by name, bio, or service area
- Filter modal with options:
  - Category (makeup, hair, nails, lash, brow)
  - Location type (home service, salon, both)
  - Price range (Budget/Mid-range/Premium)
- Pull-to-refresh
- Skeleton loading states
- Empty state when no results match

### Professional Profile View
- Full professional header (avatar, name, rating, review count)
- Bio section
- Portfolio photo carousel
- Services list with name, duration, price, and booking type
- Weekly availability schedule display
- Reviews section with rating breakdown (star distribution)
- Favorite toggle
- "Book Service" action button

### Favorites
- Save/unsave favorite professionals from any card
- Dedicated Favorites screen with full professional cards
- Pull-to-refresh
- Empty state when no favorites saved

### Client Bookings
- **Upcoming tab:** Pending and confirmed bookings sorted by date
- **Past tab:** Completed and cancelled bookings
- Booking cards display:
  - Service name and category
  - Professional name and avatar
  - Date and time
  - Status badge (color-coded)
  - Location type
- Pull-to-refresh
- Tap to view full booking detail

### Client Booking Detail
- Complete booking information display
- Service, professional/staff info, date, time, location
- Status timeline showing booking progress
- Deposit and total price breakdown
- Available actions based on status:
  - **Chat** with professional
  - **Cancel** booking (if within cancellation window)
  - **Write Review** (if completed and not yet reviewed)

### Client Profile
- Display name, phone number, avatar
- Edit Profile navigation
- Favorites navigation
- Reviews written navigation
- Settings navigation
- Logout

---

## 3. Professional Features

### Dashboard
- Personalized greeting with today's booking count
- Account type badge (Salon/Spa owner indicator)
- Today's upcoming bookings quick view
- Stats cards:
  - Total bookings
  - Completed bookings
  - Pending bookings
  - Total earnings
- Pending review requests (completed bookings needing review)
- Recent reviews received carousel
- Pull-to-refresh

### Professional Profile Management
- View and edit: name, bio, avatar
- Category badges display
- Average rating and total review count
- Portfolio photo management
- Service area display
- **Is Live** toggle (controls visibility to clients)
- Quick access to: Edit Profile, Manage Services, Availability, Settings

### Services Management
- List all services with:
  - Name, category, duration, price
  - Active/inactive status
  - Booking type indicator
- **Add Service:** Name, category, duration (minutes), price, deposit auto-calculation, booking type (instant/request), staff assignment (for salons)
- **Edit Service:** Modify all service fields, delete option
- Category filter and search

### Availability Management
- Weekly schedule editor (Monday - Sunday)
- Per-day enable/disable toggle
- Modal-based time picker for start and end times
- Time options in 1-hour increments (6:00 AM - 11:00 PM)
- "Clear All" quick action to reset schedule
- Save entire week at once

### Professional Bookings
- View all bookings filtered by status
- Manage booking status:
  - **Confirm** pending request bookings
  - **Complete** confirmed bookings after service
  - **Cancel** bookings with reason
- Staff reassignment for salon bookings
- Chat with client

### Professional Reviews
- View all reviews received
- Star ratings with review text
- Client name and avatar
- Service name and date
- Rating statistics breakdown

---

## 4. Salon/Spa Business Features

### Business Profile
- Create business: name, type (Salon/Spa/Studio), logo, description
- Linked to professional profile
- Update and manage business details

### Staff Management
- **Staff List:** View all staff with avatar, name, specialties, active status
- **Add Staff:** Name, avatar upload, specialties (multi-select categories), bio, optional phone for app linking
- **Edit Staff:** Modify details, toggle active/inactive, delete
- Active/inactive staff filtering

### Staff Availability
- Per-staff weekly schedule editor
- Individual day enable/disable with time ranges
- Modal-based time picker (matching professional availability UI)
- **Blocked Dates:** Add vacation/sick days with optional reason, view and remove blocked dates

### Staff Booking Management
- View bookings assigned to specific staff members
- Filter by status (upcoming, completed, past)
- **Auto-assignment:** System automatically assigns available staff when clients book
- **Manual reassignment:** Reassign bookings to different staff members
- Staff availability checking considers:
  - Weekly schedule
  - Blocked dates
  - Existing booking conflicts
  - Service duration

---

## 5. Booking System

### Booking Flow (Client)
- **Step 1 - Select Date:** Monthly calendar view, past dates disabled, date selection
- **Step 2 - Select Time:** Available time slots displayed as selectable chips, 30-minute intervals based on professional/staff availability
- **Step 3 - Location** (if applicable): Salon or Home Service selection, address input for home service
- **Step 4 - Confirmation:** Full booking summary with service, professional, date, time, location, pricing

### Booking Types
- **Instant Booking:** Automatically confirmed upon creation
- **Request Booking:** Requires professional approval, 12-hour response window

### Booking Statuses
- **Pending:** Awaiting professional confirmation (request type)
- **Confirmed:** Approved and scheduled
- **Completed:** Service has been delivered
- **Cancelled:** Cancelled by either party

### Pricing & Deposits
- Service price set by professional
- Automatic 30% deposit calculation
- Deposit amount displayed in booking summary and detail

### Time Slot Calculation
- Considers professional/staff weekly availability schedule
- Excludes times with existing bookings (accounting for service duration)
- For salons: checks all active staff with matching specialty
- 30-minute interval generation within available hours
- Staff auto-assignment based on availability

### Cancellation
- 24-hour cancellation window
- Tracks who cancelled (client or professional)
- Sends notification to other party

---

## 6. Messaging System

### Conversations
- Per-booking conversation threads
- Conversation list showing:
  - Other user's avatar and name
  - Service name and booking date
  - Last message preview
  - Unread message count badge
- Sorted by most recent message

### Chat Features
- Real-time message delivery via Supabase subscriptions
- Message bubbles with sender identification
- Timestamps on messages
- **Read receipts:** Messages marked as read when chat is opened
- **Typing indicators:** Real-time display when other user is typing (30-second auto-expiry)
- Auto-scroll to latest message
- Chat header showing service and booking info

### Unread Message Tracking
- Real-time unread count on Messages tab badge (bottom navigation)
- Per-conversation unread count in messages list
- Polling every 10 seconds as reliability fallback
- Supabase real-time subscription for instant updates
- App foreground detection to refresh count
- Badge displays count (up to 99+)

---

## 7. Review & Rating System

### Review Submission
- Available after booking is marked as completed
- Both clients and professionals can review each other
- 1-5 star rating selector
- Text review input
- One review per booking per user

### Review Display
- Professional profile: all reviews with rating breakdown
- Client reviews screen: all reviews written
- Professional dashboard: recent reviews section
- Star distribution visualization (per star count)

### Rating Aggregation
- Automatic average rating calculation
- Updates professional's avg_rating on new review
- Rating statistics: average, total count, per-star breakdown
- Professionals sorted by rating in discovery

### Review Eligibility
- Only participants of a completed booking can review
- Cannot review the same booking twice
- Pending review reminders on professional dashboard

---

## 8. Notification System

### Push Notifications
- Expo push notification registration (physical devices only)
- Push token storage and management in database
- Token deactivation on logout
- Multiple device support per user

### Local Notifications
- Schedule notifications with custom triggers
- Cancel individual or all scheduled notifications
- Badge count management

### Notification Types & Triggers
| Type | Trigger | Recipient |
|------|---------|-----------|
| booking_new | Client creates booking | Professional |
| booking_confirmed | Professional confirms | Client |
| booking_declined | Professional declines | Client |
| booking_cancelled | Either party cancels | Other party |
| message | New chat message sent | Recipient |
| reminder | 24 hours before appointment | Both parties |
| review_request | Booking completed | Both parties |
| staff_assigned | Staff assigned to booking | Staff member |

### Notification Logging
- All notifications logged to database
- Read/unread tracking
- Notification history retrieval with filters
- Mark individual or all as read
- Unread count tracking

### In-App Notification Handling
- Tap notification to navigate to relevant screen:
  - Booking notifications → Booking Detail
  - Message notifications → Chat Screen
  - Review notifications → Write Review Screen

---

## 9. Calendar & Scheduling

### Professional Calendar View
- Month navigation with date grid
- Week timeline with day chips
- Color-coded booking indicators on dates
- Date selection to view day's bookings
- Booking list for selected date with:
  - Client name and avatar
  - Service name
  - Time slot
  - Status badge

### Calendar Data Queries
- Bookings by date range
- Bookings by single date
- Business-wide bookings across all staff
- Status filtering

### Professional-Created Bookings
- Professionals can create bookings for walk-in clients
- Temporary client profile creation if needed

---

## 10. Media & Storage

### Image Upload
- Expo Image Picker integration
- Two storage buckets: `avatars` and `portfolios`
- Unique filename generation with timestamp
- URI to ArrayBuffer conversion for upload
- Public URL generation after upload

### Image Types
- **Avatars:** User profile photos, staff photos, business logos
- **Portfolio:** Professional work showcase (3-10 photos)

### Image Deletion
- Remove images from storage when updating profile
- Bucket-specific deletion

---

## 11. Navigation & UI

### Navigation Structure
```
Root Navigator
├── Auth Stack
│   ├── Splash Screen
│   ├── Phone Input
│   ├── OTP Verification
│   ├── Role Selection
│   ├── Client Onboarding
│   └── Professional Onboarding
│
├── Client Stack
│   ├── Client Tabs (Bottom Navigation)
│   │   ├── Discover
│   │   ├── Bookings
│   │   ├── Messages (with unread badge)
│   │   └── Profile
│   ├── Professional Profile
│   ├── Booking Flow
│   ├── Booking Detail
│   ├── Chat
│   ├── Write Review
│   ├── Reviews
│   ├── Favorites
│   ├── Edit Profile
│   └── Settings
│
└── Professional Stack
    ├── Professional Tabs (Bottom Navigation)
    │   ├── Dashboard
    │   ├── Calendar
    │   ├── Messages (with unread badge)
    │   └── Profile
    ├── Booking Detail
    ├── Chat
    ├── Write Review
    ├── Reviews
    ├── Edit Profile
    ├── Manage Services
    ├── Add Service
    ├── Edit Service
    ├── Availability
    ├── Settings
    ├── Staff List
    ├── Add Staff
    ├── Edit Staff
    ├── Staff Availability
    └── Staff Bookings
```

### UI Components Library
| Component | Description |
|-----------|-------------|
| Button | Primary/secondary variants, multiple sizes |
| GradientButton | Gradient background button for primary actions |
| Input | Text input with label and customization |
| Card | Container with rounded corners and shadow |
| StarRating | Interactive 5-star rating display |
| Loading | Full-screen or inline loading indicator |
| EmptyState | No results message with icon |
| ErrorState / ErrorBanner | Error display components |
| ProfessionalCard | Professional preview card with favorite toggle |
| WeekTimeline | Week view calendar component |
| CalendarFilterModal | Filter modal for discovery search |
| CreateBookingModal | Booking creation modal |
| BlockTimeModal | Date/time blocking modal |

### Skeleton Loaders
- ProfessionalCardSkeleton
- BookingCardSkeleton
- MessageCardSkeleton
- ServiceCardSkeleton
- Generic SkeletonLoader and SkeletonList

### Design System
- **Primary Color:** #C9A0DC (Purple)
- **Secondary Color:** #D4A5A5 (Rose)
- **Background:** #FAFAFA
- **Spacing Scale:** 4px / 8px / 16px / 24px / 32px / 48px
- **Border Radius:** 8px / 12px / 15px / 20px / 30px / 50px (round)
- **Typography:** xs (12) / sm (14) / md (16) / lg (18) / xl (20) / xxl (24) / title (48)
- **Bottom Tab Bar:** Rounded top corners, shadow, safe area insets

---

## 12. Data Models

### Core Entities
| Entity | Key Fields |
|--------|-----------|
| User | id, phone, name, avatar, role (client/professional) |
| ProfessionalProfile | bio, categories[], portfolio_photos[], location_type, service_area, avg_rating, reviews_count, is_live |
| Business | business_name, type (salon/spa/studio), logo, description |
| StaffMember | name, avatar, specialties[], bio, is_active |
| Service | name, category, duration_minutes, price, deposit_amount, booking_type |
| Booking | client_id, professional_id, service_id, staff_member_id, date, time_slot, location_type, status, deposit_amount, total_price |
| Message | booking_id, sender_id, text, read_at |
| Review | booking_id, reviewer_id, reviewee_id, rating (1-5), text, service_name |
| Availability | professional_id, day_of_week (0-6), start_time, end_time, is_available |
| StaffAvailability | staff_member_id, day_of_week, start_time, end_time, is_available |
| StaffBlockedDate | staff_member_id, date, reason |
| Favorite | user_id, professional_id |
| TypingIndicator | booking_id, user_id, started_at, expires_at |

### Relationships
```
User ──────────────── ProfessionalProfile
                         │
                         ├── Business ──── StaffMember[]
                         │                    │
                         │                    ├── StaffAvailability[]
                         │                    └── StaffBlockedDate[]
                         │
                         ├── Service[]
                         ├── Availability[]
                         └── Booking[] ──── Message[]
                                       ──── Review[]
```

---

## 13. Configuration & Constants

### App Identity
- **App Name:** BeautyConnect
- **Tagline:** "Discover. Book. Transform."
- **Currency:** Philippine Peso (₱)

### Service Categories
| Category | Icon |
|----------|------|
| Makeup | Palette |
| Hair | Scissors |
| Nails | Hand |
| Lash | Eye |
| Brow | Pen Tool |

### Price Ranges
| Range | Label | Amount |
|-------|-------|--------|
| ₱ | Budget | Up to ₱1,000 |
| ₱₱ | Mid-range | ₱1,000 - ₱3,000 |
| ₱₱₱ | Premium | ₱3,000+ |

### Business Rules
| Rule | Value |
|------|-------|
| Deposit Percentage | 30% |
| Cancellation Window | 24 hours |
| Request Booking Response Time | 12 hours |
| Min Portfolio Photos | 3 |
| Max Portfolio Photos | 10 |
| Min Bio Length | 50 characters |
| Max Bio Length | 500 characters |
| Typing Indicator Expiry | 30 seconds |
| Unread Count Poll Interval | 10 seconds |

### Backend Configuration
- **Database:** Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication:** Supabase Auth (Phone/OTP)
- **File Storage:** Supabase Storage (avatars, portfolios buckets)
- **Real-time:** Supabase Postgres Changes subscriptions
- **Environment Variables:** EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────┐
│                    React Native App                  │
│                    (Expo SDK 54)                      │
├─────────────────────────────────────────────────────┤
│  Screens (Auth / Client / Professional / Shared)     │
├─────────────────────────────────────────────────────┤
│  Components (Reusable UI Library + Skeleton Loaders) │
├─────────────────────────────────────────────────────┤
│  Navigation (React Navigation - Stack + Bottom Tabs) │
├─────────────────────────────────────────────────────┤
│  State (Zustand Auth Store) │ Hooks (Auth, Notif,   │
│                              │  Unread Messages)     │
├─────────────────────────────────────────────────────┤
│  Services Layer                                      │
│  ┌──────────┬──────────┬──────────┬──────────┐      │
│  │   Auth   │  Client  │   Pro    │ Business │      │
│  ├──────────┼──────────┼──────────┼──────────┤      │
│  │   Chat   │  Review  │ Calendar │  Notif   │      │
│  ├──────────┴──────────┴──────────┴──────────┤      │
│  │              Storage (Images)              │      │
│  └───────────────────────────────────────────┘      │
├─────────────────────────────────────────────────────┤
│              Supabase Backend                        │
│  ┌───────────┬───────────┬───────────┬───────────┐  │
│  │ PostgreSQL│   Auth    │  Storage  │ Realtime  │  │
│  │   (RLS)   │  (OTP)   │ (Buckets) │ (Changes) │  │
│  └───────────┴───────────┴───────────┴───────────┘  │
└─────────────────────────────────────────────────────┘
```

---

*Last updated: February 2026*
