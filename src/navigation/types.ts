import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import { ProfessionalProfile, Booking } from '../types';

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
  BookingDetail: { booking: Booking };
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
  BookingDetail: { booking: Booking };
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
};

// Root Stack
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Client: NavigatorScreenParams<ClientStackParamList>;
  Professional: NavigatorScreenParams<ProfessionalStackParamList>;
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
