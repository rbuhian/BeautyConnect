import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import { ProfessionalProfile, Booking, AdCreative, AffiliateProduct } from '../types';

// Auth Stack
export type AuthStackParamList = {
  Splash: undefined;
  PhoneInput: undefined;
  OtpVerification: { phone: string };
  RoleSelection: undefined;
  ClientOnboarding: undefined;
  ProfessionalOnboarding: undefined;
};

// Client Tab Navigator
export type ClientTabParamList = {
  Discover: undefined;
  Bookings: undefined;
  Messages: undefined;
  Profile: undefined;
};

// Client Stack (within tabs)
export type ClientStackParamList = {
  ClientTabs: NavigatorScreenParams<ClientTabParamList>;
  ProfessionalProfile: { professional: ProfessionalProfile };
  BookingFlow: { professional: ProfessionalProfile };
  BookingDetail: { booking?: Booking; bookingId?: string };
  Chat: { bookingId: string };
  WriteReview: {
    bookingId: string;
    serviceName: string;
    professionalId: string;
    professionalName: string;
    professionalAvatar: string | null;
  };
  Reviews: undefined;
  Favorites: undefined;
  EditProfile: undefined;
  Settings: undefined;
  Notifications: undefined;
  Payments: undefined;
};

// Professional Tab Navigator
export type ProfessionalTabParamList = {
  Dashboard: undefined;
  Calendar: undefined;
  Messages: undefined;
  Profile: undefined;
};

// Professional Stack
export type ProfessionalStackParamList = {
  ProfessionalTabs: NavigatorScreenParams<ProfessionalTabParamList>;
  BookingDetail: { booking?: Booking; bookingId?: string };
  Chat: { bookingId: string };
  WriteReview: {
    bookingId: string;
    serviceName: string;
    clientId: string;
    clientName: string;
    clientAvatar: string | null;
  };
  Reviews: undefined;
  EditProfile: undefined;
  ManageServices: undefined;
  AddService: undefined;
  EditService: { serviceId: string };
  Availability: undefined;
  Settings: undefined;
  // Staff management (for salons/businesses)
  StaffList: undefined;
  AddStaff: undefined;
  EditStaff: { staffId: string };
  StaffAvailability: { staffId: string };
  // Staff bookings (for staff members to view their assigned bookings)
  StaffBookings: undefined;
  // Advertising
  BoostProfile: undefined;
  Notifications: undefined;
  Payments: undefined;
  // Service Packages
  ManagePackages: undefined;
  CreatePackage: { packageId?: string } | undefined;
  // Promotions & Discounts
  ManagePromotions: undefined;
  CreatePromotion: { promotionId?: string } | undefined;
  // Sprint 3: Professional Tools
  ClientManagement: undefined;
  RevenueAnalytics: undefined;
  SchedulingRules: undefined;
  // Identity Verification
  Verification: undefined;
};

// Admin Tab Navigator
export type AdminTabParamList = {
  Overview: undefined;
  Ads: undefined;
  Affiliates: undefined;
  Featured: undefined;
  Payments: undefined;
  Users: undefined;
};

// Admin Stack
export type AdminStackParamList = {
  AdminTabs: NavigatorScreenParams<AdminTabParamList>;
  AdForm: { adId?: string; ad?: AdCreative } | undefined;
  AffiliateForm: { productId?: string; product?: AffiliateProduct } | undefined;
  AdminManagePromotions: undefined;
  AdminCreatePromotion: { promotionId?: string } | undefined;
  AdminProfessionalDetail: { professionalId: string };
  AdminClientDetail: { clientId: string };
  AdminVerificationDetail: { verificationId: string };
  AdminReportDetail: { reportId: string };
};

// Root Stack
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Client: NavigatorScreenParams<ClientStackParamList>;
  Professional: NavigatorScreenParams<ProfessionalStackParamList>;
  Admin: NavigatorScreenParams<AdminStackParamList>;
};

// Screen props helpers
export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type ClientTabScreenProps<T extends keyof ClientTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<ClientTabParamList, T>,
    NativeStackScreenProps<ClientStackParamList>
  >;

export type ClientScreenProps<T extends keyof ClientStackParamList> =
  NativeStackScreenProps<ClientStackParamList, T>;

export type ProfessionalTabScreenProps<T extends keyof ProfessionalTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<ProfessionalTabParamList, T>,
    NativeStackScreenProps<ProfessionalStackParamList>
  >;

export type ProfessionalScreenProps<T extends keyof ProfessionalStackParamList> =
  NativeStackScreenProps<ProfessionalStackParamList, T>;

export type AdminTabScreenProps<T extends keyof AdminTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<AdminTabParamList, T>,
    NativeStackScreenProps<AdminStackParamList>
  >;

export type AdminScreenProps<T extends keyof AdminStackParamList> =
  NativeStackScreenProps<AdminStackParamList, T>;
