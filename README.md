# BeautyConnect

A mobile marketplace app connecting beauty professionals with clients in the Philippines.

## Tech Stack

- **Framework:** React Native (Expo SDK 54)
- **Language:** TypeScript
- **Backend:** Supabase (Auth, PostgreSQL, Storage, Realtime)
- **Navigation:** React Navigation 6
- **UI:** Custom components with Linear Gradient

## Features

### For Clients
- Browse and search beauty professionals
- Filter by category (Makeup, Hair, Nails, Lash, Brow)
- Filter by price range and location type
- View professional profiles and portfolios
- Book services (instant or request-based)
- Real-time chat with professionals
- Leave reviews after completed bookings
- Save favorite professionals

### For Professionals
- Create and manage professional profile
- Add services with pricing and duration
- Set weekly availability schedule
- Accept or decline booking requests
- Chat with clients
- View earnings and booking history
- Receive reviews from clients

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device

### Installation

1. Install dependencies:
```bash
cd beautyconnect
npm install
```

2. Create `.env` file with your Supabase credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Set up Supabase database:
   - Run `supabase/schema.sql` in Supabase SQL Editor
   - Optionally run `supabase/seed-demo-data.sql` for test data

4. Start the development server:
```bash
npm start
```

5. Scan the QR code with Expo Go app

## Project Structure

```
beautyconnect/
├── src/
│   ├── components/     # Reusable UI components
│   ├── constants/      # App constants (colors, spacing, etc.)
│   ├── contexts/       # React contexts (Auth)
│   ├── hooks/          # Custom hooks
│   ├── navigation/     # Navigation configuration
│   ├── screens/        # Screen components
│   │   ├── auth/       # Authentication screens
│   │   ├── client/     # Client-specific screens
│   │   └── professional/ # Professional-specific screens
│   ├── services/       # API service functions
│   └── types/          # TypeScript type definitions
├── supabase/
│   ├── schema.sql      # Database schema
│   └── seed-demo-data.sql # Demo data for testing
└── assets/             # Images and fonts
```

## Demo Accounts

For testing with demo data:

| Role | Name | Phone |
|------|------|-------|
| Client | Maria Santos | +639171234567 |
| Client | Ana Reyes | +639182345678 |
| Professional | Bella Garcia | +639201111111 |
| Professional | Carmen Dela Cruz | +639202222222 |

In development mode, use any 6-digit OTP code (e.g., `123456`) to log in.

## Currency

The app uses Philippine Peso (PHP) with the following price ranges:
- **Budget (₱):** Up to ₱1,000
- **Mid-range (₱₱):** ₱1,000 - ₱3,000
- **Premium (₱₱₱):** Above ₱3,000

## License

Proprietary - All rights reserved.
