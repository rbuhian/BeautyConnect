import {
  submitReview,
  getReviewsForProfessional,
  getReviewsByUser,
  getReviewsReceived,
  canReviewBooking,
  getBookingReview,
  getPendingReviews,
  getRatingStats,
} from '../review';
import { supabase } from '../supabase';

jest.mock('../supabase');

describe('Review Service', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // submitReview
  // ============================================
  describe('submitReview', () => {
    it('should submit a review successfully', async () => {
      const mockReview = {
        id: 'review-1',
        booking_id: 'booking-1',
        reviewer_id: 'user-1',
        reviewee_id: 'user-2',
        rating: 5,
        text: 'Great service!',
        service_name: 'Haircut',
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockReview, error: null }),
          }),
        }),
      } as any);

      const result = await submitReview('booking-1', 'user-1', 'user-2', 5, 'Great service!', 'Haircut');

      expect(result.data).toEqual(mockReview);
      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('reviews');
    });

    it('should reject rating below 1', async () => {
      const result = await submitReview('booking-1', 'user-1', 'user-2', 0, 'Bad', 'Haircut');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('Rating must be between 1 and 5');
    });

    it('should reject rating above 5', async () => {
      const result = await submitReview('booking-1', 'user-1', 'user-2', 6, 'Great', 'Haircut');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it('should trim text and handle empty text', async () => {
      const mockReview = {
        id: 'review-1',
        booking_id: 'booking-1',
        reviewer_id: 'user-1',
        reviewee_id: 'user-2',
        rating: 4,
        text: null,
        service_name: 'Haircut',
      };

      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockReview, error: null }),
        }),
      });

      mockSupabase.from.mockReturnValue({ insert: insertMock } as any);

      await submitReview('booking-1', 'user-1', 'user-2', 4, '   ', 'Haircut');

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ text: null })
      );
    });

    it('should handle database errors', async () => {
      const mockError = { message: 'Database error', code: '23505' };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: mockError }),
          }),
        }),
      } as any);

      const result = await submitReview('booking-1', 'user-1', 'user-2', 5, 'Great', 'Haircut');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  // ============================================
  // getReviewsForProfessional
  // ============================================
  describe('getReviewsForProfessional', () => {
    it('should return reviews with joins', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          rating: 5,
          text: 'Excellent',
          reviewer: { id: 'user-1', name: 'Maria', avatar: null },
          booking: { date: '2026-01-15', service: { name: 'Haircut', category: 'Hair' } },
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockReviews, error: null }),
          }),
        }),
      } as any);

      const result = await getReviewsForProfessional('pro-user-1');

      expect(result.data).toEqual(mockReviews);
      expect(result.error).toBeNull();
    });

    it('should apply category filter', async () => {
      const filterMock = jest.fn().mockResolvedValue({ data: [], error: null });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              filter: filterMock,
            }),
          }),
        }),
      } as any);

      await getReviewsForProfessional('pro-user-1', { category: 'Hair' });

      expect(filterMock).toHaveBeenCalledWith('booking.service.category', 'eq', 'Hair');
    });

    it('should apply limit and offset', async () => {
      const limitMock = jest.fn().mockReturnValue({
        range: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: limitMock,
            }),
          }),
        }),
      } as any);

      await getReviewsForProfessional('pro-user-1', { limit: 10, offset: 20 });

      expect(limitMock).toHaveBeenCalledWith(10);
    });

    it('should handle errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
          }),
        }),
      } as any);

      const result = await getReviewsForProfessional('pro-user-1');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  // ============================================
  // getReviewsByUser
  // ============================================
  describe('getReviewsByUser', () => {
    it('should return reviews written by user', async () => {
      const mockReviews = [{ id: 'review-1', rating: 4, text: 'Good' }];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockReviews, error: null }),
          }),
        }),
      } as any);

      const result = await getReviewsByUser('user-1');

      expect(result.data).toEqual(mockReviews);
      expect(result.error).toBeNull();
    });

    it('should handle errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: new Error('fail') }),
          }),
        }),
      } as any);

      const result = await getReviewsByUser('user-1');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  // ============================================
  // getReviewsReceived
  // ============================================
  describe('getReviewsReceived', () => {
    it('should return reviews received', async () => {
      const mockReviews = [{ id: 'review-1', rating: 5 }];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockReviews, error: null }),
          }),
        }),
      } as any);

      const result = await getReviewsReceived('pro-user-1');

      expect(result.data).toEqual(mockReviews);
      expect(result.error).toBeNull();
    });

    it('should apply limit when provided', async () => {
      const limitMock = jest.fn().mockResolvedValue({ data: [], error: null });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: limitMock,
            }),
          }),
        }),
      } as any);

      await getReviewsReceived('pro-user-1', 5);

      expect(limitMock).toHaveBeenCalledWith(5);
    });

    it('should handle errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: new Error('fail') }),
          }),
        }),
      } as any);

      const result = await getReviewsReceived('pro-user-1');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  // ============================================
  // canReviewBooking
  // ============================================
  describe('canReviewBooking', () => {
    it('should return false when booking not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
      } as any);

      const result = await canReviewBooking('booking-1', 'user-1');

      expect(result.canReview).toBe(false);
      expect(result.reason).toBe('Booking not found');
    });

    it('should return false when booking is not completed', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'booking-1',
                status: 'pending',
                client_id: 'user-1',
                professional: { user_id: 'pro-1' },
              },
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await canReviewBooking('booking-1', 'user-1');

      expect(result.canReview).toBe(false);
      expect(result.reason).toBe('Booking must be completed to leave a review');
    });

    it('should return false when user is not a participant', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'booking-1',
                status: 'completed',
                client_id: 'other-user',
                professional: { user_id: 'pro-1' },
              },
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await canReviewBooking('booking-1', 'user-1');

      expect(result.canReview).toBe(false);
      expect(result.reason).toBe('You are not part of this booking');
    });

    it('should return false when already reviewed', async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: get booking
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'booking-1',
                    status: 'completed',
                    client_id: 'user-1',
                    professional: { user_id: 'pro-1', user: { name: 'Pro', avatar: null } },
                    service: { name: 'Haircut' },
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        // Second call: check existing review
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'existing-review' },
                  error: null,
                }),
              }),
            }),
          }),
        } as any;
      });

      const result = await canReviewBooking('booking-1', 'user-1');

      expect(result.canReview).toBe(false);
      expect(result.reason).toBe('You have already reviewed this booking');
    });

    it('should return true for client who can review', async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'booking-1',
                    status: 'completed',
                    client_id: 'user-1',
                    professional: { user_id: 'pro-1', user: { name: 'Pro Name', avatar: 'avatar.jpg' } },
                    service: { name: 'Haircut' },
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        } as any;
      });

      const result = await canReviewBooking('booking-1', 'user-1');

      expect(result.canReview).toBe(true);
      expect(result.bookingDetails).toBeDefined();
      expect(result.bookingDetails.revieweeId).toBe('pro-1');
    });
  });

  // ============================================
  // getBookingReview
  // ============================================
  describe('getBookingReview', () => {
    it('should return a review when found', async () => {
      const mockReview = { id: 'review-1', rating: 5, text: 'Great' };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockReview, error: null }),
            }),
          }),
        }),
      } as any);

      const result = await getBookingReview('booking-1', 'user-1');

      expect(result.data).toEqual(mockReview);
      expect(result.error).toBeNull();
    });

    it('should return null when no review exists (PGRST116)', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'No rows returned' },
              }),
            }),
          }),
        }),
      } as any);

      const result = await getBookingReview('booking-1', 'user-1');

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it('should handle real errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: '42P01', message: 'Table not found' },
              }),
            }),
          }),
        }),
      } as any);

      const result = await getBookingReview('booking-1', 'user-1');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  // ============================================
  // getPendingReviews
  // ============================================
  describe('getPendingReviews', () => {
    it('should return empty when no completed bookings', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      } as any);

      const result = await getPendingReviews('user-1');

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('should filter out already reviewed bookings', async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // bookings query
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'booking-1',
                        date: '2026-01-15',
                        client_id: 'user-1',
                        service: { name: 'Haircut' },
                        professional: { user_id: 'pro-1', user: { name: 'Pro', avatar: null } },
                      },
                      {
                        id: 'booking-2',
                        date: '2026-01-10',
                        client_id: 'user-1',
                        service: { name: 'Facial' },
                        professional: { user_id: 'pro-2', user: { name: 'Pro 2', avatar: null } },
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          } as any;
        }
        // reviews query
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ booking_id: 'booking-1' }],
              error: null,
            }),
          }),
        } as any;
      });

      const result = await getPendingReviews('user-1');

      expect(result.data).toHaveLength(1);
      expect(result.data![0].bookingId).toBe('booking-2');
      expect(result.data![0].serviceName).toBe('Facial');
    });

    it('should handle errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: null, error: new Error('fail') }),
            }),
          }),
        }),
      } as any);

      const result = await getPendingReviews('user-1');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  // ============================================
  // getRatingStats
  // ============================================
  describe('getRatingStats', () => {
    it('should return zeros when no reviews exist', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      } as any);

      const result = await getRatingStats('pro-user-1');

      expect(result.data).toEqual({
        avgRating: 0,
        totalReviews: 0,
        ratingBreakdown: [
          { rating: 5, count: 0 },
          { rating: 4, count: 0 },
          { rating: 3, count: 0 },
          { rating: 2, count: 0 },
          { rating: 1, count: 0 },
        ],
      });
    });

    it('should calculate average and breakdown correctly', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { rating: 5 },
              { rating: 5 },
              { rating: 4 },
              { rating: 3 },
              { rating: 5 },
            ],
            error: null,
          }),
        }),
      } as any);

      const result = await getRatingStats('pro-user-1');

      expect(result.data!.avgRating).toBe(4.4);
      expect(result.data!.totalReviews).toBe(5);
      expect(result.data!.ratingBreakdown).toEqual([
        { rating: 5, count: 3 },
        { rating: 4, count: 1 },
        { rating: 3, count: 1 },
        { rating: 2, count: 0 },
        { rating: 1, count: 0 },
      ]);
    });

    it('should handle errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: new Error('fail') }),
        }),
      } as any);

      const result = await getRatingStats('pro-user-1');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });
});
