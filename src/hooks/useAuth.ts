import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    if (!store.initialized) {
      store.initialize();
    }
  }, [store.initialized]);

  return {
    // State
    session: store.session,
    user: store.user,
    professionalProfile: store.professionalProfile,
    loading: store.loading,
    initialized: store.initialized,
    error: store.error,

    // Computed
    isAuthenticated: !!store.user,
    isClient: store.user?.role === 'client',
    isProfessional: store.user?.role === 'professional',
    needsOnboarding: store.user && !store.user.name,

    // Actions
    sendOtp: store.sendOtp,
    verifyOtp: store.verifyOtp,
    signUp: store.signUp,
    signIn: store.signIn,
    updateProfile: store.updateProfile,
    setRole: store.setRole,
    refreshProfessionalProfile: store.refreshProfessionalProfile,
    logout: store.logout,
    clearError: store.clearError,
  };
}
