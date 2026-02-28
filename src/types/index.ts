// User types
export type UserRole = 'client' | 'professional' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: UserRole;
  created_at: string;
  is_suspended: boolean;
  email_notifications?: boolean;
}

// Professional types
export type Category = 'makeup' | 'hair' | 'nails' | 'lash' | 'brow';
export type LocationType = 'home_service' | 'salon' | 'both';
export type BookingType = 'instant' | 'request';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface ProfessionalProfile {
  id: string;
  user_id: string;
  bio: string;
  categories: Category[];
  portfolio_photos: string[];
  service_area: string;
  location_type: LocationType;
  salon_address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_live: boolean;
  is_verified: boolean;
  verification_status: VerificationStatus;
  avg_rating: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
  // Joined from users table
  user?: User;
  // Joined business data (if this is a salon/spa/studio)
  business?: Business;
  staff_members?: StaffMember[];
}

export interface ProfessionalVerification {
  id: string;
  professional_id: string;
  status: 'pending' | 'verified' | 'rejected';
  id_document_path: string | null;
  certificate_paths: string[];
  submission_notes: string | null;
  admin_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

// Business types
export type BusinessType = 'salon' | 'spa' | 'studio';

export interface Business {
  id: string;
  professional_id: string;
  business_name: string;
  business_type: BusinessType;
  logo: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Staff member types
export interface StaffMember {
  id: string;
  business_id: string;
  user_id: string | null; // NULL = staff without app account
  name: string;
  avatar: string | null;
  specialties: Category[];
  bio: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: User;
  availability?: StaffAvailability[];
}

export interface StaffAvailability {
  id: string;
  staff_member_id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string; // HH:MM format
  end_time: string;
  is_available: boolean;
}

export interface StaffBlockedDate {
  id: string;
  staff_member_id: string;
  date: string;
  reason: string | null;
}

export interface ProfessionalBlockedDate {
  id: string;
  professional_id: string;
  date: string;
  reason: string | null;
  created_at: string;
}

// Service types
export interface Service {
  id: string;
  professional_id: string;
  staff_member_id: string | null; // NULL = any staff can perform
  name: string;
  category: Category;
  duration_minutes: number;
  price: number;
  deposit_amount: number;
  booking_type: BookingType;
  is_active: boolean;
  created_at: string;
  // Joined data
  staff_member?: StaffMember;
}

// Service Package types
export interface PackageService {
  id: string;
  package_id: string;
  service_id: string;
  sort_order: number;
  service?: Service; // joined
}

export interface ServicePackage {
  id: string;
  professional_id: string;
  name: string;
  description: string | null;
  total_price: number;
  discount_pct: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  package_services?: PackageService[];
}

// Promotion types
export type DiscountType = 'percentage' | 'fixed';

export interface Promotion {
  id: string;
  professional_id: string | null; // NULL = platform-wide
  code: string;
  title: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
}

export interface PromotionUse {
  id: string;
  promotion_id: string;
  booking_id: string;
  client_id: string;
  discount_applied: number;
  created_at: string;
}

// Availability types
export interface Availability {
  id: string;
  professional_id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string; // HH:MM format
  end_time: string;
  is_available: boolean;
}

// Booking types
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  client_id: string;
  professional_id: string;
  service_id: string;
  staff_member_id: string | null; // NULL for individual pros or "Any Available"
  date: string;
  time_slot: string;
  location_type: 'home' | 'salon';
  client_address: string | null;
  status: BookingStatus;
  deposit_paid: boolean;
  deposit_amount: number;
  total_price: number;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_at: string;
  // Joined data
  service?: Service;
  professional?: ProfessionalProfile;
  client?: User;
  staff_member?: StaffMember;
}

// Review types
export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number; // 1-5
  text: string;
  service_name: string;
  created_at: string;
  // Joined data
  reviewer?: User;
}

// Message types
export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  read_at: string | null;
  // Joined data
  sender?: User;
}

// Typing indicator types
export interface TypingIndicator {
  user_id: string;
  started_at: string;
  expires_at: string;
}

// Scheduling Rules types
export interface SchedulingRules {
  id: string;
  professional_id: string;
  buffer_minutes: number;
  max_daily_bookings: number | null;
  lunch_break_enabled: boolean;
  lunch_start_time: string;
  lunch_end_time: string;
  travel_buffer_minutes: number;
  min_advance_booking_hours: number;
  created_at: string;
  updated_at: string;
}

// Filter types
export type PriceRange = '₱' | '₱₱' | '₱₱₱';

export interface ProfessionalFilters {
  category?: Category;
  location_type?: LocationType;
  price_range?: PriceRange;
  max_distance_km?: number;
}

// ============================================
// ADVERTISING TYPES
// ============================================

export type AdType = 'feed_card' | 'interstitial' | 'banner' | 'affiliate_card' | 'sponsored_content';
export type AdStatus = 'active' | 'paused' | 'expired';
export type AdTargetRole = 'client' | 'professional' | 'both';
export type FeaturedPackageKey = 'boost_1d' | 'weekly' | 'monthly' | 'priority_category';

export interface AdCreative {
  id: string;
  type: AdType;
  advertiser_name: string;
  headline: string;
  subtext: string;
  image_url: string | null;
  cta_label: string;
  cta_url: string;
  target_categories: Category[];
  target_user_role: AdTargetRole;
  status: AdStatus;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface FeaturedListing {
  id: string;
  professional_id: string;
  package: FeaturedPackageKey;
  price_paid: number;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  payment_ref: string | null;
  created_at: string;
}

export interface FeaturedPackage {
  key: FeaturedPackageKey;
  label: string;
  price: number;
  duration_days: number;
  description: string;
}

export interface AffiliateProduct {
  id: string;
  name: string;
  brand: string;
  image_url: string;
  price: number;
  affiliate_url: string;
  target_categories: Category[];
  commission_rate: number;
  is_active: boolean;
  created_at: string;
}

// Union types for mixed-content feeds
export type DiscoverFeedItem =
  | { item_type: 'professional'; data: Omit<ProfessionalProfile, 'user'> & { user: { id: string; name: string | null; avatar: string | null }; services: Service[]; min_price?: number; max_price?: number; is_featured?: boolean } }
  | { item_type: 'ad'; data: AdCreative }
  | { item_type: 'sponsored_content'; data: AdCreative };

export type ChatFeedItem =
  | { item_type: 'message'; data: Message }
  | { item_type: 'affiliate'; data: AffiliateProduct };

// ============================================
// ADMIN TYPES
// ============================================

export interface AdStats {
  ad_id: string;
  impressions: number;
  clicks: number;
  ctr: number; // click-through rate as percentage
}

export interface AdCreativeWithStats extends AdCreative {
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface FeaturedListingWithProfessional extends FeaturedListing {
  professional_name: string | null;
  professional_avatar: string | null;
  professional_categories: Category[];
}

export interface AdminDashboardStats {
  total_ads: number;
  active_ads: number;
  paused_ads: number;
  total_impressions: number;
  total_clicks: number;
  overall_ctr: number;
  total_featured_revenue: number;
  active_featured_listings: number;
  total_affiliate_products: number;
  active_affiliate_products: number;
  total_professionals: number;
  active_professionals: number;
  total_clients: number;
}

// ============================================
// ADMIN USER MANAGEMENT TYPES
// ============================================

export interface ProfessionalListItem {
  id: string;              // professional_profiles.id
  user_id: string;
  name: string | null;
  avatar: string | null;
  email: string;
  categories: Category[];
  location_type: LocationType;
  is_live: boolean;
  avg_rating: number;
  total_reviews: number;
  created_at: string;
  business_name: string | null;
  business_type: BusinessType | null;
}

export interface ClientListItem {
  id: string;              // users.id
  name: string | null;
  avatar: string | null;
  email: string;
  created_at: string;
  is_suspended: boolean;
  booking_count: number;
  total_spent: number;
}

export interface AdminProfessionalDetail {
  id: string;
  user_id: string;
  name: string | null;
  avatar: string | null;
  email: string;
  bio: string;
  categories: Category[];
  location_type: LocationType;
  service_area: string;
  salon_address: string | null;
  is_live: boolean;
  avg_rating: number;
  total_reviews: number;
  created_at: string;
  business: Business | null;
  total_bookings: number;
  completed_bookings: number;
  total_revenue: number;
  services: Service[];
  recent_bookings: Booking[];
}

export interface AdminClientDetail {
  id: string;
  name: string | null;
  avatar: string | null;
  email: string;
  created_at: string;
  is_suspended: boolean;
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  total_spent: number;
  bookings: Booking[];
}

// ============================================
// REPORT & BLOCK TYPES
// ============================================

export type ReportReason =
  | 'harassment'
  | 'inappropriate_content'
  | 'fraud'
  | 'unsafe_practices'
  | 'no_show'
  | 'spam'
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';

export interface UserReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}
