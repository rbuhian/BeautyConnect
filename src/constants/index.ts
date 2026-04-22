import { Category } from '../types';

// App info
export const APP_NAME = 'BeautyConnect';
export const APP_TAGLINE = 'Discover. Book. Transform.';

// Colors - matching the mockup gradient theme
export const COLORS = {
  // Primary gradient colors
  primary: '#C9A0DC',
  secondary: '#D4A5A5',

  // Gradient
  gradientStart: '#C9A0DC',
  gradientEnd: '#D4A5A5',

  // Neutrals
  white: '#FFFFFF',
  background: '#FAFAFA',
  card: '#FFFFFF',
  border: '#F0F0F0',

  // Text
  textPrimary: '#2D2D2D',
  textSecondary: '#888888',
  textLight: '#999999',

  // Semantic
  success: '#4CAF50',
  warning: '#FFB800',
  error: '#F44336',

  // UI elements
  inputBackground: '#F5F5F5',
  chipBackground: '#F5F5F5',
  chipActive: '#C9A0DC',
  primaryLight: '#F3E5F5',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(255, 255, 255, 0.95)',
} as const;

// Typography
export const FONTS = {
  // Headers - using system fonts, can swap for Cormorant Garamond later
  headerRegular: 'System',
  headerBold: 'System',

  // Body - using system fonts, can swap for Poppins later
  bodyLight: 'System',
  bodyRegular: 'System',
  bodyMedium: 'System',
  bodySemiBold: 'System',
  bodyBold: 'System',
} as const;

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  title: 48,
} as const;

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Border radius
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 15,
  xl: 20,
  xxl: 30,
  round: 50,
  full: 50,
} as const;

// Categories
export const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'makeup', label: 'Makeup', icon: 'brush' },
  { value: 'hair', label: 'Hair', icon: 'cut' },
  { value: 'bridal', label: 'Bridal', icon: 'heart' },
  { value: 'wedding', label: 'Wedding', icon: 'ribbon' },
  { value: 'event', label: 'Event', icon: 'calendar' },
  { value: 'glam', label: 'Glam', icon: 'star' },
  { value: 'aesthetic', label: 'Aesthetic', icon: 'sparkles' },
  { value: 'prosthetic', label: 'Prosthetic', icon: 'construct' },
  { value: 'fantasy', label: 'Fantasy', icon: 'color-wand' },
  { value: 'light', label: 'Light', icon: 'sunny' },
  { value: 'modelling', label: 'Modelling', icon: 'camera' },
  { value: 'pageant', label: 'Pageant', icon: 'trophy' },
  { value: 'festival', label: 'Festival', icon: 'musical-notes' },
  { value: 'funeral', label: 'Funeral', icon: 'flower' },
  { value: 'others', label: 'Others', icon: 'ellipsis-horizontal' },
];

// Location types
export const LOCATION_TYPES = [
  { value: 'home_service', label: 'Home Service' },
  { value: 'salon', label: 'Salon' },
  { value: 'both', label: 'Both' },
] as const;

// Currency
export const CURRENCY = {
  symbol: '₱',
  code: 'PHP',
} as const;

// Price ranges (in PHP)
export const PRICE_RANGES = [
  { value: '₱', label: '₱', description: 'Budget-friendly', maxPrice: 1000 },
  { value: '₱₱', label: '₱₱', description: 'Mid-range', minPrice: 1000, maxPrice: 3000 },
  { value: '₱₱₱', label: '₱₱₱', description: 'Premium', minPrice: 3000 },
] as const;

// Distance options (in km)
export const DISTANCE_OPTIONS = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
] as const;

// Booking
export const DEPOSIT_PERCENTAGE = 0.30;
export const CANCELLATION_HOURS = 24;
export const REQUEST_BOOKING_HOURS = 12;

// Validation
export const MIN_PORTFOLIO_PHOTOS = 3;
export const MAX_PORTFOLIO_PHOTOS = 10;
export const MIN_BIO_LENGTH = 50;
export const MAX_BIO_LENGTH = 500;

// API
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Feature flags
export const FEATURES = {
  ADS_ENABLED: false,
} as const;

// Advertising
export const AD_CONFIG = {
  FEED_AD_FREQUENCY: 8,                // Insert 1 ad card every N professional cards
  INTERSTITIAL_COOLDOWN_MS: 86400000,  // 24 hours between post-booking interstitials
  FEATURED_MAX_POSITIONS: 3,           // Max featured pros shown at top of Discover
  AFFILIATE_DISMISS_TTL_MS: 86400000,  // 24 hours before dismissed affiliate card can reappear
  INTERSTITIAL_SKIP_DELAY_MS: 3000,    // 3 seconds before "Skip" button is enabled
} as const;

export const FEATURED_PACKAGES: import('../types').FeaturedPackage[] = [
  { key: 'boost_1d', label: 'Boost (1 Day)', price: 99, duration_days: 1, description: 'Top placement for 24 hours' },
  { key: 'weekly', label: 'Weekly Boost', price: 399, duration_days: 7, description: 'Stay visible for a full week' },
  { key: 'monthly', label: 'Monthly Feature', price: 999, duration_days: 30, description: 'Best value — 30 days of top placement' },
  { key: 'priority_category', label: 'Priority Category', price: 1499, duration_days: 30, description: 'Top of your category for 30 days' },
];
