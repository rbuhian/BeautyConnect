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
} as const;

// Categories
export const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'makeup', label: 'Makeup', icon: 'brush' },
  { value: 'hair', label: 'Hair', icon: 'cut' },
  { value: 'nails', label: 'Nails', icon: 'color-palette' },
  { value: 'lash', label: 'Lash', icon: 'eye' },
  { value: 'brow', label: 'Brow', icon: 'eye-outline' },
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
