import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { User, ProfessionalProfile } from '../types';
import { supabase } from '../services/supabase';
import {
  signInWithPhone,
  verifyOtp,
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

  // Actions
  initialize: () => Promise<void>;
  sendOtp: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (phone: string, token: string) => Promise<{ success: boolean; isNewUser?: boolean; error?: string }>;
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

        if (event === 'SIGNED_IN' && session?.user) {
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

  sendOtp: async (phone: string) => {
    // Don't set global loading - screens handle their own loading states
    set({ error: null });
    const { error } = await signInWithPhone(phone);

    if (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  verifyOtp: async (phone: string, token: string) => {
    // Don't set global loading - screens handle their own loading states
    set({ error: null });
    const { data, error } = await verifyOtp(phone, token);

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

    // If professional, create professional profile
    if (role === 'professional') {
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
    });
  },

  clearError: () => set({ error: null }),
}));
