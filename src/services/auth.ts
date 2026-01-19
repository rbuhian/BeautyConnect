import { supabase } from './supabase';
import { User, UserRole, ProfessionalProfile } from '../types';

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthResponse<T = void> {
  data: T | null;
  error: AuthError | null;
}

// Sign in with phone - sends OTP
export async function signInWithPhone(phone: string): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to send OTP. Please try again.' } };
  }
}

// Verify OTP
export async function verifyOtp(
  phone: string,
  token: string
): Promise<AuthResponse<{ isNewUser: boolean }>> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    // Check if user profile exists
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user?.id)
      .single();

    const isNewUser = !userProfile?.name;

    return { data: { isNewUser }, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to verify OTP. Please try again.' } };
  }
}

// Get current user profile
export async function getCurrentUser(): Promise<AuthResponse<User>> {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return { data: null, error: null };
    }

    const { data: userProfile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return { data: userProfile as User, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch user profile.' } };
  }
}

// Update user profile
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, 'name' | 'avatar' | 'role'>>
): Promise<AuthResponse<User>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return { data: data as User, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to update profile.' } };
  }
}

// Create professional profile
export async function createProfessionalProfile(
  userId: string
): Promise<AuthResponse<ProfessionalProfile>> {
  try {
    const { data, error } = await supabase
      .from('professional_profiles')
      .insert({
        user_id: userId,
        bio: '',
        categories: [],
        portfolio_photos: [],
        service_area: '',
        location_type: 'both',
        is_live: false,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return { data: data as ProfessionalProfile, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to create professional profile.' } };
  }
}

// Get professional profile
export async function getProfessionalProfile(
  userId: string
): Promise<AuthResponse<ProfessionalProfile>> {
  try {
    const { data, error } = await supabase
      .from('professional_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { data: null, error: { message: error.message } };
    }

    return { data: data as ProfessionalProfile | null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch professional profile.' } };
  }
}

// Sign out
export async function signOut(): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to sign out.' } };
  }
}
