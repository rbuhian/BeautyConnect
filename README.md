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

## Building for Android

### Option 1: Development Build (Recommended for Testing)

1. Install EAS CLI globally:
```bash
npm install -g eas-cli
```

2. Login to your Expo account:
```bash
eas login
```

3. Configure EAS Build (first time only):
```bash
eas build:configure
```

4. Create a development build APK:
```bash
eas build --platform android --profile preview
```

5. Once the build completes, download the APK from the provided URL and install it on your Android device.

### Option 2: Local Development Build

1. Install Android Studio and set up Android SDK.

2. Set the ANDROID_HOME environment variable:
```bash
# Windows (add to system environment variables)
ANDROID_HOME=C:\Users\<username>\AppData\Local\Android\Sdk

# macOS/Linux (add to ~/.bashrc or ~/.zshrc)
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

3. Generate native Android project:
```bash
npx expo prebuild --platform android
```

4. Build the APK locally:
```bash
cd android
./gradlew assembleRelease
```

5. The APK will be located at:
```
android/app/build/outputs/apk/release/app-release.apk
```

### Option 3: Production Build (For Play Store)

1. Create a production build:
```bash
eas build --platform android --profile production
```

2. This generates an AAB (Android App Bundle) file for Google Play Store submission.

## Deploying to Android Phone

### Method 1: Using USB (Direct Install)

1. Enable **Developer Options** on your Android phone:
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
   - Go back to Settings > Developer Options
   - Enable "USB Debugging"

2. Connect your phone via USB cable.

3. Install the APK using ADB:
```bash
adb install path/to/your-app.apk
```

### Method 2: Using File Transfer

1. Download the APK to your computer.

2. Transfer the APK to your phone via:
   - USB cable (copy to Downloads folder)
   - Google Drive
   - Email attachment
   - Direct download link

3. On your phone:
   - Enable "Install from Unknown Sources" in Settings > Security
   - Open the APK file using a file manager
   - Tap "Install"

### Method 3: Using Expo Go (Development Only)

1. Install Expo Go from Google Play Store.

2. Start the development server:
```bash
npm start
```

3. Scan the QR code with Expo Go app.

Note: Expo Go is for development/testing only. For production, use EAS Build.

## EAS Build Profiles

The `eas.json` file contains build profiles:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

- **development**: Debug build with dev client
- **preview**: APK for internal testing
- **production**: AAB for Play Store

## Troubleshooting

### Build Fails
- Ensure all dependencies are installed: `npm install`
- Clear cache: `npx expo start --clear`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

### APK Won't Install
- Enable "Install from Unknown Sources" in phone settings
- Uninstall any previous version of the app first
- Check if there's enough storage space

### App Crashes on Launch
- Check Supabase credentials in `.env` file
- Verify database schema is set up correctly
- Check logs: `adb logcat | grep -i react`

## License

Proprietary - All rights reserved.
