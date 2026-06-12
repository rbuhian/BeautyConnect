import {
  signInWithEmail,
  verifyOtp,
  getCurrentUser,
  updateUserProfile,
  createProfessionalProfile,
  signOut,
} from '../auth';
import { supabase } from '../supabase';

jest.mock('../supabase');

describe('Auth Service', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // signInWithEmail
  // ============================================
  describe('signInWithEmail', () => {
    it('should send OTP successfully', async () => {
      (mockSupabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({ error: null });

      const result = await signInWithEmail('test@example.com');

      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
    });

    it('should handle auth error', async () => {
      (mockSupabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({
        error: { message: 'Rate limit exceeded', code: 'over_email_send_rate_limit' },
      });

      const result = await signInWithEmail('test@example.com');

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('Rate limit exceeded');
    });

    it('should handle unexpected throws', async () => {
      (mockSupabase.auth.signInWithOtp as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await signInWithEmail('test@example.com');

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('Failed to send OTP. Please try again.');
    });
  });

  // ============================================
  // verifyOtp
  // ============================================
  describe('verifyOtp', () => {
    it('should verify OTP for existing user', async () => {
      (mockSupabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
        data: { user: { id: 'auth-user-1' } },
        error: null,
      });

      // Mock migrateSeedDataToNewUser - first call checks for seed user
      let fromCallCount = 0;
      mockSupabase.from.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          // migrateSeedDataToNewUser: check for seed user
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                neq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
                }),
              }),
            }),
          } as any;
        }
        // getCurrentUser profile fetch
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'auth-user-1', name: 'Maria', phone: '+639123456789', role: 'client' },
                error: null,
              }),
            }),
          }),
        } as any;
      });

      const result = await verifyOtp('+639123456789', '123456');

      expect(result.data).toEqual({ isNewUser: false });
      expect(result.error).toBeNull();
    });

    it('should identify new user (no name set)', async () => {
      (mockSupabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
        data: { user: { id: 'auth-user-2' } },
        error: null,
      });

      let fromCallCount = 0;
      mockSupabase.from.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          // migrateSeedDataToNewUser: no seed user
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                neq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
                }),
              }),
            }),
          } as any;
        }
        if (fromCallCount === 2) {
          // Fetch user profile - not found
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
              }),
            }),
          } as any;
        }
        // Create new user profile
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'auth-user-2', name: null, phone: '+639999999999', role: 'client' },
                error: null,
              }),
            }),
          }),
        } as any;
      });

      const result = await verifyOtp('+639999999999', '654321');

      expect(result.data).toEqual({ isNewUser: true });
    });

    it('should handle auth verification error', async () => {
      (mockSupabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid OTP', code: 'otp_expired' },
      });

      const result = await verifyOtp('+639123456789', '000000');

      expect(result.data).toBeNull();
      expect(result.error!.message).toBe('Invalid OTP');
    });

    it('should handle missing user ID after verification', async () => {
      (mockSupabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
        data: { user: {} },
        error: null,
      });

      const result = await verifyOtp('+639123456789', '123456');

      expect(result.data).toBeNull();
      expect(result.error!.message).toBe('User ID not found after verification');
    });
  });

  // ============================================
  // getCurrentUser
  // ============================================
  describe('getCurrentUser', () => {
    it('should return user profile', async () => {
      const mockUser = { id: 'user-1', name: 'Maria', phone: '+639123456789', role: 'client' };

      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      } as any);

      const result = await getCurrentUser();

      expect(result.data).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it('should return null when no auth user', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      const result = await getCurrentUser();

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it('should handle database error', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
          }),
        }),
      } as any);

      const result = await getCurrentUser();

      expect(result.data).toBeNull();
      expect(result.error!.message).toBe('DB error');
    });
  });

  // ============================================
  // updateUserProfile
  // ============================================
  describe('updateUserProfile', () => {
    it('should update profile successfully', async () => {
      const updatedUser = { id: 'user-1', name: 'Maria Santos', role: 'client' };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: updatedUser, error: null }),
            }),
          }),
        }),
      } as any);

      const result = await updateUserProfile('user-1', { name: 'Maria Santos' });

      expect(result.data).toEqual(updatedUser);
      expect(result.error).toBeNull();
    });

    it('should handle errors', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } }),
            }),
          }),
        }),
      } as any);

      const result = await updateUserProfile('user-1', { name: 'Test' });

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  // ============================================
  // createProfessionalProfile
  // ============================================
  describe('createProfessionalProfile', () => {
    it('should create profile and default availability', async () => {
      const mockProfile = { id: 'profile-1', user_id: 'user-1', bio: '', is_live: false };
      const insertMock = jest.fn();

      let fromCallCount = 0;
      mockSupabase.from.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          // professional_profiles insert
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
              }),
            }),
          } as any;
        }
        // availability insert
        return {
          insert: insertMock.mockResolvedValue({ data: null, error: null }),
        } as any;
      });

      const result = await createProfessionalProfile('user-1');

      expect(result.data).toEqual(mockProfile);
      expect(result.error).toBeNull();
      // Should insert 7 days of availability
      expect(insertMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ day_of_week: 0, is_available: false }), // Sunday off
          expect.objectContaining({ day_of_week: 1, is_available: true }),  // Monday on
          expect.objectContaining({ day_of_week: 6, is_available: false }), // Saturday off
        ])
      );
    });

    it('should handle profile creation error', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Duplicate' } }),
          }),
        }),
      } as any);

      const result = await createProfessionalProfile('user-1');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  // ============================================
  // signOut
  // ============================================
  describe('signOut', () => {
    it('should sign out successfully', async () => {
      (mockSupabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

      const result = await signOut();

      expect(result.error).toBeNull();
    });

    it('should handle sign out error', async () => {
      (mockSupabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: { message: 'Sign out failed' },
      });

      const result = await signOut();

      expect(result.error!.message).toBe('Sign out failed');
    });

    it('should handle unexpected throws', async () => {
      (mockSupabase.auth.signOut as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await signOut();

      expect(result.error!.message).toBe('Failed to sign out.');
    });
  });
});
