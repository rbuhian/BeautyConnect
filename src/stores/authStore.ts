import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { User, ProfessionalProfile } from '../types';
import { supabase } from '../services/supabase';
import {
  signInWithEmail,
  verifyOtp,
  signUpWithPassword,
  signInWithPassword,
  sendPasswordResetOtp,
  verifyResetOtp,
  updatePassword,
  getCurrentUser,
  updateUserProfile,
  createProfessionalProfile,
  getProfessionalProfile,
  signOut,
} from '../services/auth';

interface AuthState {
  session: Session | null;
  user: User | null;
  professionalProfile: ProfessionalProfile | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  // True while a password-reset flow is in progress. Keeps the user in the Auth
  // stack even though verifying the reset OTP creates a temporary session.
  recoveringPassword: boolean;

  // Actions
  initialize: () => Promise<void>;
  sendOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; isNewUser?: boolean; error?: string }>;
  signUp: (name: string, email: string, password: string, role: 'client' | 'professional') => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  sendPasswordResetOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyResetOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'avatar' | 'role'>>) => Promise<{ success: boolean; error?: string }>;
  setRole: (role: 'client' | 'professional') => Promise<{ success: boolean; error?: string }>;
  refreshProfessionalProfile: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  professionalProfile: null,
  loading: true,
  initialized: false,
  error: null,
  recoveringPassword: false,

  initialize: async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      set({ session });

      if (session?.user) {
        // Fetch user profile
        const { data: user } = await getCurrentUser();
        set({ user });

        // If professional, fetch professional profile
        if (user?.role === 'professional') {
          const { data: proProfile } = await getProfessionalProfile(user.id);
          set({ professionalProfile: proProfile });
        }
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        set({ session });

        // During a password reset, verifying the OTP creates a session and fires
        // SIGNED_IN. Skip loading the user here so RootNavigator stays on the Auth
        // stack (user stays null) and the ResetPassword screen isn't reset away.
        if (event === 'SIGNED_IN' && session?.user && !get().recoveringPassword) {
          const { data: user } = await getCurrentUser();
          set({ user });

          if (user?.role === 'professional') {
            const { data: proProfile } = await getProfessionalProfile(user.id);
            set({ professionalProfile: proProfile });
          }
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, professionalProfile: null });
        }
      });
    } catch (err) {
      console.error('Auth initialization error:', err);
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  sendOtp: async (email: string) => {
    // Don't set global loading - screens handle their own loading states
    set({ error: null });
    const { error } = await signInWithEmail(email);

    if (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  signUp: async (name: string, email: string, password: string, role: 'client' | 'professional') => {
    set({ error: null });
    const { error } = await signUpWithPassword(email, password, name, role);

    if (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    }

    // Fetch user after signup (session is set automatically if email confirmation is off)
    const { data: user } = await getCurrentUser();
    set({ user });

    if (role === 'professional' && user) {
      const { data: proProfile } = await getProfessionalProfile(user.id);
      if (!proProfile) {
        const { data: newProfile } = await createProfessionalProfile(user.id);
        set({ professionalProfile: newProfile });
      } else {
        set({ professionalProfile: proProfile });
      }
    }

    return { success: true };
  },

  signIn: async (email: string, password: string) => {
    set({ error: null });
    const { error } = await signInWithPassword(email, password);

    if (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    }

    const { data: user } = await getCurrentUser();
    set({ user });

    if (user?.role === 'professional') {
      const { data: proProfile } = await getProfessionalProfile(user.id);
      set({ professionalProfile: proProfile });
    }

    return { success: true };
  },

  sendPasswordResetOtp: async (email: string) => {
    set({ error: null });
    const { error } = await sendPasswordResetOtp(email);

    if (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  verifyResetOtp: async (email: string, token: string) => {
    // Set the flag BEFORE verifying: verifyOtp creates a session and fires
    // SIGNED_IN, and the onAuthStateChange handler checks this flag to avoid
    // loading the user (which would reset the Auth navigator away from reset).
    set({ error: null, recoveringPassword: true });
    const { error } = await verifyResetOtp(email, token);

    if (error) {
      set({ error: error.message, recoveringPassword: false });
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  updatePassword: async (newPassword: string) => {
    set({ error: null });
    const { error } = await updatePassword(newPassword);

    if (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  verifyOtp: async (email: string, token: string) => {
    // Don't set global loading - screens handle their own loading states
    set({ error: null });
    const { data, error } = await verifyOtp(email, token);

    if (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    }

    // Fetch user after verification
    const { data: user } = await getCurrentUser();
    set({ user });

    // If professional, fetch professional profile
    if (user?.role === 'professional') {
      const { data: proProfile } = await getProfessionalProfile(user.id);
      set({ professionalProfile: proProfile });
    }

    return { success: true, isNewUser: data?.isNewUser };
  },

  updateProfile: async (updates) => {
    const { user } = get();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    set({ loading: true, error: null });
    const { data, error } = await updateUserProfile(user.id, updates);
    set({ loading: false });

    if (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    }

    set({ user: data });
    return { success: true };
  },

  setRole: async (role) => {
    const { user } = get();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    set({ loading: true, error: null });

    // Update user role
    const { data: updatedUser, error } = await updateUserProfile(user.id, { role });

    if (error) {
      set({ loading: false, error: error.message });
      return { success: false, error: error.message };
    }

    set({ user: updatedUser });

    // If professional, get or create professional profile
    if (role === 'professional') {
      // First check if profile already exists
      const { data: existingProfile } = await getProfessionalProfile(user.id);

      if (existingProfile) {
        // Use existing profile
        set({ professionalProfile: existingProfile, loading: false });
        return { success: true };
      }

      // Create new profile if none exists
      const { data: proProfile, error: proError } = await createProfessionalProfile(user.id);

      if (proError) {
        set({ loading: false, error: proError.message });
        return { success: false, error: proError.message };
      }

      set({ professionalProfile: proProfile });
    }

    set({ loading: false });
    return { success: true };
  },

  refreshProfessionalProfile: async () => {
    const { user } = get();
    if (user?.role === 'professional') {
      const { data: proProfile } = await getProfessionalProfile(user.id);
      set({ professionalProfile: proProfile });
    }
  },

  logout: async () => {
    set({ loading: true });
    await signOut();
    set({
      session: null,
      user: null,
      professionalProfile: null,
      loading: false,
      error: null,
      recoveringPassword: false,
    });
  },

  clearError: () => set({ error: null }),
}));
