import {
  getProfessionalPaymentSummary,
  getMonthlyEarnings,
  getRecentTransactions,
  getPendingDeposits,
  getClientPaymentSummary,
  getClientPaymentHistory,
} from '../payments-analytics';
import { supabase } from '../supabase';

jest.mock('../supabase');

describe('Payments Analytics Service', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // getProfessionalPaymentSummary
  // ============================================
  describe('getProfessionalPaymentSummary', () => {
    it('should calculate all summary fields correctly', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'bookings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [
                  { total_price: 1000, deposit_paid: true, deposit_amount: 500, status: 'completed' },
                  { total_price: 2000, deposit_paid: true, deposit_amount: 1000, status: 'completed' },
                  { total_price: 500, deposit_paid: false, deposit_amount: 250, status: 'pending' },
                ],
                error: null,
              }),
            }),
          } as any;
        }
        // featured_listings
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ price_paid: 300 }, { price_paid: 500 }],
              error: null,
            }),
          }),
        } as any;
      });

      const result = await getProfessionalPaymentSummary('prof-1');

      expect(result.data).toEqual({
        totalEarnings: 3000, // 1000 + 2000 (completed only)
        depositsCollected: 2, // 2 paid deposits
        depositTotal: 1500, // 500 + 1000
        featuredSpend: 800, // 300 + 500
      });
      expect(result.error).toBeNull();
    });

    it('should handle empty data', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      } as any);

      const result = await getProfessionalPaymentSummary('prof-1');

      expect(result.data).toEqual({
        totalEarnings: 0,
        depositsCollected: 0,
        depositTotal: 0,
        featuredSpend: 0,
      });
    });

    it('should handle bookings query error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'bookings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'DB error' },
              }),
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        } as any;
      });

      const result = await getProfessionalPaymentSummary('prof-1');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  // ============================================
  // getMonthlyEarnings
  // ============================================
  describe('getMonthlyEarnings', () => {
    it('should return 6 months of data', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      } as any);

      const result = await getMonthlyEarnings('prof-1');

      expect(result.data).toHaveLength(6);
      expect(result.data![0]).toHaveProperty('month');
      expect(result.data![0]).toHaveProperty('year');
      expect(result.data![0]).toHaveProperty('total');
      expect(result.data![0]).toHaveProperty('label');
    });

    it('should group bookings by month correctly', async () => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const dateThisMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-15`;

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({
                data: [
                  { total_price: 1000, date: dateThisMonth },
                  { total_price: 2000, date: dateThisMonth },
                ],
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await getMonthlyEarnings('prof-1');

      // The last entry should be the current month with the total
      const currentMonthEntry = result.data!.find(
        (e) => e.month === currentMonth && e.year === currentYear
      );
      expect(currentMonthEntry).toBeDefined();
      expect(currentMonthEntry!.total).toBe(3000);
    });

    it('should handle errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
            }),
          }),
        }),
      } as any);

      const result = await getMonthlyEarnings('prof-1');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  // ============================================
  // getRecentTransactions
  // ============================================
  describe('getRecentTransactions', () => {
    it('should merge bookings and featured listings sorted by date', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'bookings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({
                      data: [
                        {
                          id: 'b1',
                          total_price: 1500,
                          date: '2026-01-20',
                          status: 'completed',
                          deposit_paid: true,
                          service: { name: 'Haircut' },
                          client: { name: 'Maria' },
                        },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          } as any;
        }
        // featured_listings
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'f1',
                      package: 'weekly',
                      price_paid: 500,
                      created_at: '2026-01-22T10:00:00Z',
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        } as any;
      });

      const result = await getRecentTransactions('prof-1', 10);

      expect(result.data).toHaveLength(2);
      // Featured listing (Jan 22) should come before booking (Jan 20) since sorted desc
      expect(result.data![0].type).toBe('featured_expense');
      expect(result.data![0].description).toBe('Weekly Boost');
      expect(result.data![1].type).toBe('booking_income');
      expect(result.data![1].clientName).toBe('Maria');
    });

    it('should handle empty data', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      } as any);

      const result = await getRecentTransactions('prof-1');

      expect(result.data).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await getRecentTransactions('prof-1');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  // ============================================
  // getPendingDeposits
  // ============================================
  describe('getPendingDeposits', () => {
    it('should return unpaid deposits for pending/confirmed bookings', async () => {
      const mockBookings = [
        { id: 'b1', deposit_paid: false, status: 'pending', service: { name: 'Haircut' } },
        { id: 'b2', deposit_paid: false, status: 'confirmed', service: { name: 'Facial' } },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: mockBookings, error: null }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await getPendingDeposits('prof-1');

      expect(result.data).toEqual(mockBookings);
      expect(result.error).toBeNull();
    });

    it('should return empty array when no pending deposits', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await getPendingDeposits('prof-1');

      expect(result.data).toEqual([]);
    });

    it('should handle errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await getPendingDeposits('prof-1');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  // ============================================
  // getClientPaymentSummary
  // ============================================
  describe('getClientPaymentSummary', () => {
    it('should calculate client summary correctly', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { total_price: 2000, deposit_paid: true, deposit_amount: 1000, status: 'completed' },
              { total_price: 1500, deposit_paid: true, deposit_amount: 750, status: 'completed' },
              { total_price: 800, deposit_paid: false, deposit_amount: 400, status: 'pending' },
            ],
            error: null,
          }),
        }),
      } as any);

      const result = await getClientPaymentSummary('client-1');

      expect(result.data).toEqual({
        totalSpent: 3500, // 2000 + 1500 (completed only)
        depositsCount: 2,
        depositsTotal: 1750, // 1000 + 750
      });
    });

    it('should handle empty data', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      } as any);

      const result = await getClientPaymentSummary('client-1');

      expect(result.data).toEqual({
        totalSpent: 0,
        depositsCount: 0,
        depositsTotal: 0,
      });
    });

    it('should handle errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
        }),
      } as any);

      const result = await getClientPaymentSummary('client-1');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  // ============================================
  // getClientPaymentHistory
  // ============================================
  describe('getClientPaymentHistory', () => {
    it('should map booking data to payment items correctly', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'b1',
                  date: '2026-01-20',
                  total_price: 2000,
                  deposit_amount: 1000,
                  deposit_paid: true,
                  status: 'completed',
                  service: { name: 'Haircut' },
                  professional: { user: { name: 'Pro Name' } },
                },
              ],
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await getClientPaymentHistory('client-1');

      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toEqual({
        id: 'b1',
        serviceName: 'Haircut',
        professionalName: 'Pro Name',
        date: '2026-01-20',
        totalPrice: 2000,
        depositAmount: 1000,
        depositPaid: true,
        status: 'completed',
      });
    });

    it('should handle missing joins gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'b1',
                  date: '2026-01-20',
                  total_price: null,
                  deposit_amount: null,
                  deposit_paid: null,
                  status: 'pending',
                  service: null,
                  professional: null,
                },
              ],
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await getClientPaymentHistory('client-1');

      expect(result.data![0].serviceName).toBe('Service');
      expect(result.data![0].professionalName).toBe('Professional');
      expect(result.data![0].totalPrice).toBe(0);
      expect(result.data![0].depositPaid).toBe(false);
    });

    it('should handle errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
          }),
        }),
      } as any);

      const result = await getClientPaymentHistory('client-1');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });
});
