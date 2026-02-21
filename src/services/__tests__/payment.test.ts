import {
  createCheckoutSession,
  checkPaymentStatus,
  waitForPayment,
  createDepositCheckout,
  checkDepositStatus,
  waitForDepositPayment,
} from '../payment';
import { supabase } from '../supabase';

jest.mock('../supabase');

describe('Payment Service', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  // ============================================
  // createCheckoutSession
  // ============================================
  describe('createCheckoutSession', () => {
    it('should create a checkout session successfully', async () => {
      const mockResponse = {
        checkoutUrl: 'https://checkout.paymongo.com/session123',
        sessionId: 'session123',
      };

      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await createCheckoutSession('boost_1d', 'prof-1', 5000, 'Boost 1 Day');

      expect(result.data).toEqual(mockResponse);
      expect(result.error).toBeNull();
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-checkout', {
        body: {
          packageKey: 'boost_1d',
          professionalId: 'prof-1',
          amount: 5000,
          description: 'Boost 1 Day',
        },
      });
    });

    it('should handle edge function error', async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Edge function error' },
      });

      const result = await createCheckoutSession('boost_1d', 'prof-1', 5000, 'Boost');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error!.code).toBe('CHECKOUT_ERROR');
    });

    it('should handle missing checkoutUrl in response', async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { sessionId: 'session123' },
        error: null,
      });

      const result = await createCheckoutSession('boost_1d', 'prof-1', 5000, 'Boost');

      expect(result.data).toBeNull();
      expect(result.error!.code).toBe('INVALID_RESPONSE');
    });

    it('should handle unexpected throws', async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await createCheckoutSession('boost_1d', 'prof-1', 5000, 'Boost');

      expect(result.data).toBeNull();
      expect(result.error!.code).toBe('UNKNOWN_ERROR');
    });
  });

  // ============================================
  // checkPaymentStatus
  // ============================================
  describe('checkPaymentStatus', () => {
    it('should return paid when listing exists', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 'listing-1' }, error: null }),
          }),
        }),
      } as any);

      const status = await checkPaymentStatus('session123');

      expect(status).toBe('paid');
    });

    it('should return pending when listing not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      } as any);

      const status = await checkPaymentStatus('session123');

      expect(status).toBe('pending');
    });

    it('should return pending on error', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('DB error')),
          }),
        }),
      } as any);

      const status = await checkPaymentStatus('session123');

      expect(status).toBe('pending');
    });
  });

  // ============================================
  // waitForPayment
  // ============================================
  describe('waitForPayment', () => {
    it('should return paid immediately if payment is found', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 'listing-1' }, error: null }),
          }),
        }),
      } as any);

      const status = await waitForPayment('session123', 3, 10);

      expect(status).toBe('paid');
    });

    it('should return paid after retries', async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: callCount >= 3 ? { id: 'listing-1' } : null,
                error: null,
              }),
            }),
          }),
        } as any;
      });

      const status = await waitForPayment('session123', 5, 10);

      expect(status).toBe('paid');
    });

    it('should return pending after max attempts', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      } as any);

      const status = await waitForPayment('session123', 2, 10);

      expect(status).toBe('pending');
    });
  });

  // ============================================
  // createDepositCheckout
  // ============================================
  describe('createDepositCheckout', () => {
    it('should create a deposit checkout successfully', async () => {
      const mockResponse = {
        checkoutUrl: 'https://checkout.paymongo.com/dep123',
        sessionId: 'dep123',
      };

      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await createDepositCheckout('booking-1', 2500, 'Haircut');

      expect(result.data).toEqual(mockResponse);
      expect(result.error).toBeNull();
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-checkout', {
        body: {
          type: 'booking_deposit',
          bookingId: 'booking-1',
          amount: 2500,
          description: 'Deposit for Haircut',
        },
      });
    });

    it('should handle edge function error with data.error', async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { error: 'Booking not found' },
        error: { message: 'Edge function returned error' },
      });

      const result = await createDepositCheckout('booking-1', 2500, 'Haircut');

      expect(result.data).toBeNull();
      expect(result.error!.message).toBe('Booking not found');
    });

    it('should handle missing fields in response', async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { checkoutUrl: 'https://example.com' },
        error: null,
      });

      const result = await createDepositCheckout('booking-1', 2500, 'Haircut');

      expect(result.data).toBeNull();
      expect(result.error!.code).toBe('INVALID_RESPONSE');
    });

    it('should handle unexpected throws', async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await createDepositCheckout('booking-1', 2500, 'Haircut');

      expect(result.data).toBeNull();
      expect(result.error!.code).toBe('UNKNOWN_ERROR');
    });
  });

  // ============================================
  // checkDepositStatus
  // ============================================
  describe('checkDepositStatus', () => {
    it('should return paid when deposit_paid is true', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { deposit_paid: true }, error: null }),
          }),
        }),
      } as any);

      const status = await checkDepositStatus('booking-1');

      expect(status).toBe('paid');
    });

    it('should return pending when deposit_paid is false', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { deposit_paid: false }, error: null }),
          }),
        }),
      } as any);

      const status = await checkDepositStatus('booking-1');

      expect(status).toBe('pending');
    });

    it('should return pending on error', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('DB error')),
          }),
        }),
      } as any);

      const status = await checkDepositStatus('booking-1');

      expect(status).toBe('pending');
    });
  });

  // ============================================
  // waitForDepositPayment
  // ============================================
  describe('waitForDepositPayment', () => {
    it('should return paid immediately when deposit is paid', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { deposit_paid: true }, error: null }),
          }),
        }),
      } as any);

      const status = await waitForDepositPayment('booking-1', 3, 10);

      expect(status).toBe('paid');
    });

    it('should return pending after max attempts', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { deposit_paid: false }, error: null }),
          }),
        }),
      } as any);

      const status = await waitForDepositPayment('booking-1', 2, 10);

      expect(status).toBe('pending');
    });
  });
});
