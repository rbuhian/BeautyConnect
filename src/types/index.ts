// User types
export type UserRole = 'client' | 'professional';

export interface User {
  id: string;
  phone: string;
  name: string | null;
  avatar: string | null;
  role: UserRole;
  created_at: string;
}

// Professional types
export type Category = 'makeup' | 'hair' | 'nails' | 'lash' | 'brow';
export type LocationType = 'home_service' | 'salon' | 'both';
export type BookingType = 'instant' | 'request';

export interface ProfessionalProfile {
  id: string;
  user_id: string;
  bio: string;
  categories: Category[];
  portfolio_photos: string[];
  service_area: string;
  location_type: LocationType;
  salon_address: string | null;
  is_live: boolean;
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

// Filter types
export type PriceRange = '$' | '$$' | '$$$';

export interface ProfessionalFilters {
  category?: Category;
  location_type?: LocationType;
  price_range?: PriceRange;
  max_distance_km?: number;
}
