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

### Prerequisites for Android Builds

- **Expo Account**: Create a free account at [expo.dev](https://expo.dev)
- **EAS CLI**: Install globally with `npm install -g eas-cli`
- **Node.js**: Version 18 or higher

### Quick Start: Build APK for Testing

```bash
# 1. Login to Expo (one-time)
eas login

# 2. Build APK (cloud build, no local setup needed)
eas build --platform android --profile preview

# 3. Download APK from the URL provided when build completes
```

The build takes approximately 10-15 minutes on EAS servers. You'll receive a download link when complete.

---

### Option 1: EAS Cloud Build (Recommended)

**Best for**: Quick testing, sharing with team, no local Android setup required.

#### Preview Build (APK)

```bash
# Build APK for internal testing
eas build --platform android --profile preview
```

- Builds on Expo's cloud servers
- Generates installable APK file
- Free tier: 30 builds/month

#### Development Build (with Dev Client)

```bash
# Build with development client for debugging
eas build --platform android --profile development
```

- Includes React Native dev tools
- Supports hot reload
- Best for active development

#### Production Build (AAB for Play Store)

```bash
# Build Android App Bundle for Play Store
eas build --platform android --profile production
```

- Generates AAB (Android App Bundle)
- Required format for Google Play Store
- Optimized for distribution

---

### Option 2: Local Build (Without EAS Cloud)

**Best for**: Offline builds, CI/CD pipelines, custom signing.

#### Prerequisites

1. **Install Android Studio**: Download from [developer.android.com](https://developer.android.com/studio)

2. **Install Android SDK** (via Android Studio SDK Manager):
   - Android SDK Platform 34 (or latest)
   - Android SDK Build-Tools
   - Android Emulator (optional)

3. **Set Environment Variables**:

   **Finding your Android SDK location:**
   - Open Android Studio
   - Go to **File > Settings > Languages & Frameworks > Android SDK**
   - Copy the path shown in "Android SDK Location"

   **Windows** (System Environment Variables):

   Common SDK locations on Windows:
   ```
   C:\Android\Sdk
   C:\Users\<username>\Android\Sdk
   C:\Program Files\Android\Sdk
   ```

   Set ANDROID_HOME:
   1. Press `Win + R`, type `sysdm.cpl`, press Enter
   2. Go to **Advanced** tab > **Environment Variables**
   3. Under "User variables", click **New**:
      - Variable name: `ANDROID_HOME`
      - Variable value: `<your SDK path>` (e.g., `C:\Android\Sdk`)
   4. Edit **Path** variable and add:
      ```
      %ANDROID_HOME%\platform-tools
      %ANDROID_HOME%\emulator
      ```
   5. Restart terminal/IDE for changes to take effect

   **macOS/Linux** (add to ~/.bashrc or ~/.zshrc):
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

   **Verify setup:**
   ```bash
   # Check if adb is accessible
   adb --version
   ```

4. **Install Java JDK 17**:
   ```bash
   # Windows: Download from adoptium.net
   # macOS:
   brew install openjdk@17
   # Linux:
   sudo apt install openjdk-17-jdk
   ```

#### Build Steps

```bash
# 1. Generate native Android project
npx expo prebuild --platform android

# 2. Build debug APK
cd android
./gradlew assembleDebug

# 3. Or build release APK
./gradlew assembleRelease
```

#### APK Output Locations

- Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `android/app/build/outputs/apk/release/app-release.apk`

---

### Option 3: Build with Local EAS

**Best for**: Faster builds using local machine, no cloud dependency.

```bash
# Build locally using EAS
eas build --platform android --profile preview --local
```

Requires Android SDK and Java JDK to be installed locally.

## Deploying to Android Phone

### Method 1: Direct Download from EAS (Easiest)

After running `eas build`, you'll receive a URL like:
```
https://expo.dev/artifacts/eas/xxxxx.apk
```

1. Open this URL on your Android phone's browser
2. Download the APK
3. Open the downloaded file and tap "Install"
4. If prompted, enable "Install from Unknown Sources"

### Method 2: Using ADB (USB Install)

**Setup (one-time):**

1. Enable **Developer Options** on your Android phone:
   - Go to **Settings > About Phone**
   - Tap **"Build Number"** 7 times
   - Go back to **Settings > Developer Options**
   - Enable **"USB Debugging"**

2. Connect your phone via USB cable

3. Verify connection:
   ```bash
   adb devices
   ```
   You should see your device listed.

**Install APK:**
```bash
# Install new app
adb install path/to/beautyconnect.apk

# Reinstall/update existing app
adb install -r path/to/beautyconnect.apk

# Install and grant all permissions
adb install -g path/to/beautyconnect.apk
```

### Method 3: File Transfer

1. Transfer the APK to your phone via:
   - USB cable (copy to Downloads folder)
   - Google Drive / OneDrive
   - Email attachment
   - Bluetooth

2. On your phone:
   - Open **Files** or any file manager app
   - Navigate to the APK file
   - Tap to install
   - Enable **"Install from Unknown Sources"** if prompted

### Method 4: Internal Distribution (Team Sharing)

Use EAS for distributing to testers:

```bash
# Configure internal distribution
eas build --platform android --profile preview

# Share the build link with testers
# They can install directly from expo.dev
```

Testers need to:
1. Create an Expo account
2. Accept the invitation to your project
3. Download builds from expo.dev dashboard

### Method 5: Expo Go (Development Only)

**Note**: Expo Go has limitations - some native features won't work.

1. Install **Expo Go** from Google Play Store

2. Start development server:
   ```bash
   npm start
   ```

3. Scan the QR code with Expo Go

**Limitations of Expo Go:**
- No push notifications (requires native build)
- No custom native modules
- Limited to Expo SDK features

---

## Over-the-Air (OTA) Updates

Update your app without rebuilding - users get updates automatically.

### Setup EAS Update

```bash
# Configure updates (one-time)
eas update:configure

# Publish an update
eas update --branch preview --message "Bug fixes and improvements"
```

### How It Works

1. Users with the app installed receive updates on next app launch
2. No need to download new APK for JavaScript/asset changes
3. Native code changes still require new build

### Update Channels

```bash
# Update preview builds
eas update --branch preview

# Update production builds
eas update --branch production
```

## EAS Build Profiles

The `eas.json` file defines build configurations:

```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "gradleCommand": ":app:assembleDebug"
      }
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
  },
  "submit": {
    "production": {}
  }
}
```

| Profile | Use Case | Output | Distribution |
|---------|----------|--------|--------------|
| `development` | Active development with debugging | APK with dev client | Internal |
| `preview` | Testing before release | APK | Internal |
| `production` | Play Store submission | AAB (App Bundle) | Store |

### Common EAS Commands

```bash
# List all builds
eas build:list

# View build details
eas build:view

# Cancel a running build
eas build:cancel

# Check build status
eas build:list --status=in-progress

# Download latest build
eas build:list --platform android --limit 1
```

---

## Version Management

### Updating App Version

Edit `app.json` before building:

```json
{
  "expo": {
    "version": "1.0.0",
    "android": {
      "versionCode": 1
    }
  }
}
```

- **version**: User-facing version (e.g., "1.0.0")
- **versionCode**: Integer that must increase with each Play Store upload

### Auto-increment Version

```bash
# Increment version for new build
eas build --platform android --profile production --auto-submit
```

## Push Notifications Setup

Push notifications require Firebase Cloud Messaging (FCM) configuration for Android.

### Setting Up FCM for Android

1. Go to [Firebase Console](https://console.firebase.google.com/)

2. Create a new project or select existing one

3. Add Android app:
   - Package name: `com.beautyconnect.app`
   - Download `google-services.json`

4. Place `google-services.json` in your project root

5. Update `app.json` to include:
```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

6. Rebuild the app:
```bash
eas build --platform android --profile development
```

### Common Push Notification Error

If you see this error:
```
ERROR  Error getting push token: [Error: Make sure to complete the guide at
https://docs.expo.dev/push-notifications/fcm-credentials/ : Default FirebaseApp
is not initialized in this process com.beautyconnect.app. Make sure to call
FirebaseApp.initializeApp(Context) first.]
```

**Solution:** This means Firebase is not configured. Follow the steps above to set up FCM credentials, then rebuild the app. The app will still work without push notifications - this error is handled gracefully.

For detailed instructions, see: https://docs.expo.dev/push-notifications/fcm-credentials/

## Troubleshooting

### EAS Build Issues

**Build fails with dependency errors:**
```bash
# Clear caches and reinstall
rm -rf node_modules
rm -rf .expo
npm cache clean --force
npm install
```

**Build queued for too long:**
```bash
# Check EAS status
eas build:list --status=in-progress

# Cancel and retry
eas build:cancel
eas build --platform android --profile preview
```

**Credentials error:**
```bash
# Reset Android credentials
eas credentials --platform android
```

### Local Build Issues

**"Unsupported class file major version" error:**

This means your Java version is incompatible. React Native requires **Java 17**.

```
Unsupported class file major version 69  → Java 25 (too new)
Unsupported class file major version 65  → Java 21 (too new)
Unsupported class file major version 61  → Java 17 ✓ (correct)
```

**Fix:**
1. Install Java 17 (JDK 17):
   - Windows: Download from [Adoptium](https://adoptium.net/temurin/releases/?version=17)
   - Select: Windows x64, JDK, .msi installer

2. Set JAVA_HOME to Java 17:
   ```bash
   # Windows - check installed Java versions
   where java

   # Set JAVA_HOME (replace path with your JDK 17 location)
   set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot
   ```

3. Add to System Environment Variables permanently:
   - Press `Win + R`, type `sysdm.cpl`
   - Advanced → Environment Variables
   - Set `JAVA_HOME` = `C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot`

4. Verify:
   ```bash
   java -version
   # Should show: openjdk version "17.x.x"
   ```

**JAVA_HOME not set:**
```bash
# Windows
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.13-hotspot

# macOS/Linux
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
```

**Gradle build fails:**
```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew assembleRelease
```

**SDK licenses not accepted:**
```bash
# Accept all licenses
yes | sdkmanager --licenses
```

### APK Installation Issues

**"App not installed" error:**
- Uninstall any previous version first
- Check storage space (need ~100MB free)
- Enable "Install from Unknown Sources"
- Try: `adb install -r -d app.apk`

**"Package appears to be corrupt":**
- Re-download the APK
- Check if download completed fully
- Try different download method

**App won't open after install:**
- Check Android version compatibility (requires Android 6.0+)
- View crash logs: `adb logcat | grep -i "beautyconnect\|crash\|fatal"`

### App Runtime Issues

**App crashes on launch:**
```bash
# View detailed logs
adb logcat *:E | grep -i react

# Check Supabase connection
# Verify .env file has correct credentials
```

**White/blank screen:**
- Check if JavaScript bundle loaded
- Verify Supabase URL is accessible
- Check network connectivity

**Network requests failing:**
```bash
# Test Supabase connection
curl https://your-project.supabase.co/rest/v1/
```

### Push Notifications Issues

**"FirebaseApp not initialized" error:**
1. Ensure `google-services.json` is in project root
2. Verify package name matches Firebase config
3. Rebuild the app: `eas build --platform android --profile preview`

**Notifications not appearing:**
- Check device notification settings for the app
- Verify notification channels are created
- Test with: `adb shell dumpsys notification`

**Token generation fails:**
- FCM requires Google Play Services
- Won't work on emulators without Play Services
- Check Firebase Console for errors

### Debug Commands

```bash
# View real-time logs
adb logcat | grep -E "(ReactNative|beautyconnect)"

# Clear app data
adb shell pm clear com.beautyconnect.app

# Force stop app
adb shell am force-stop com.beautyconnect.app

# Check installed version
adb shell dumpsys package com.beautyconnect.app | grep versionName
```

## License

Proprietary - All rights reserved.
