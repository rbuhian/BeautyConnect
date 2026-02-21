import { supabase } from './supabase';
import { Booking, FeaturedListing } from '../types';
import { ServiceResponse } from './professional';

// ============================================
// TYPES
// ============================================

export interface PaymentSummary {
  totalEarnings: number;
  depositsCollected: number;
  depositTotal: number;
  featuredSpend: number;
}

export interface MonthlyEarning {
  month: number; // 0-11
  year: number;
  total: number;
  label: string; // "Jan", "Feb", etc.
}

export interface Transaction {
  id: string;
  type: 'booking_income' | 'featured_expense';
  description: string;
  amount: number;
  date: string;
  status?: string;
  clientName?: string;
  serviceName?: string;
  packageLabel?: string;
}

export interface ClientPaymentSummary {
  totalSpent: number;
  depositsCount: number;
  depositsTotal: number;
}

export interface ClientPaymentItem {
  id: string;
  serviceName: string;
  professionalName: string;
  date: string;
  totalPrice: number;
  depositAmount: number;
  depositPaid: boolean;
  status: string;
}

// ============================================
// PROFESSIONAL FUNCTIONS
// ============================================

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function getProfessionalPaymentSummary(
  professionalId: string
): Promise<ServiceResponse<PaymentSummary>> {
  try {
    const [bookingsRes, featuredRes] = await Promise.all([
      supabase
        .from('bookings')
        .select('total_price, deposit_paid, deposit_amount, status')
        .eq('professional_id', professionalId),
      supabase
        .from('featured_listings')
        .select('price_paid')
        .eq('professional_id', professionalId),
    ]);

    if (bookingsRes.error) {
      return { data: null, error: { message: bookingsRes.error.message } };
    }

    const bookings = bookingsRes.data || [];
    const featured = featuredRes.data || [];

    const totalEarnings = bookings
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + (b.total_price || 0), 0);

    const paidDeposits = bookings.filter((b) => b.deposit_paid);
    const depositsCollected = paidDeposits.length;
    const depositTotal = paidDeposits.reduce((sum, b) => sum + (b.deposit_amount || 0), 0);

    const featuredSpend = featured.reduce((sum, f) => sum + (f.price_paid || 0), 0);

    return {
      data: { totalEarnings, depositsCollected, depositTotal, featuredSpend },
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch payment summary' } };
  }
}

export async function getMonthlyEarnings(
  professionalId: string
): Promise<ServiceResponse<MonthlyEarning[]>> {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const { data, error } = await supabase
      .from('bookings')
      .select('total_price, date')
      .eq('professional_id', professionalId)
      .eq('status', 'completed')
      .gte('date', sixMonthsAgo.toISOString().split('T')[0]);

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    // Group by month
    const monthMap = new Map<string, number>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthMap.set(key, 0);
    }

    (data || []).forEach((b) => {
      const d = new Date(b.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (monthMap.has(key)) {
        monthMap.set(key, (monthMap.get(key) || 0) + (b.total_price || 0));
      }
    });

    const result: MonthlyEarning[] = [];
    monthMap.forEach((total, key) => {
      const [year, month] = key.split('-').map(Number);
      result.push({ month, year, total, label: MONTH_LABELS[month] });
    });

    return { data: result, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch monthly earnings' } };
  }
}

export async function getRecentTransactions(
  professionalId: string,
  limit = 10
): Promise<ServiceResponse<Transaction[]>> {
  try {
    const [bookingsRes, featuredRes] = await Promise.all([
      supabase
        .from('bookings')
        .select('id, total_price, date, status, deposit_paid, service:services(name), client:users!bookings_client_id_fkey(name)')
        .eq('professional_id', professionalId)
        .eq('status', 'completed')
        .order('date', { ascending: false })
        .limit(limit),
      supabase
        .from('featured_listings')
        .select('id, package, price_paid, created_at')
        .eq('professional_id', professionalId)
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);

    const transactions: Transaction[] = [];

    (bookingsRes.data || []).forEach((b: any) => {
      transactions.push({
        id: b.id,
        type: 'booking_income',
        description: b.service?.name || 'Service',
        amount: b.total_price || 0,
        date: b.date,
        status: b.status,
        clientName: b.client?.name || 'Client',
        serviceName: b.service?.name,
      });
    });

    const PACKAGE_LABELS: Record<string, string> = {
      boost_1d: 'Boost (1 Day)',
      weekly: 'Weekly Boost',
      monthly: 'Monthly Feature',
      priority_category: 'Priority Category',
    };

    (featuredRes.data || []).forEach((f: any) => {
      transactions.push({
        id: f.id,
        type: 'featured_expense',
        description: PACKAGE_LABELS[f.package] || f.package,
        amount: f.price_paid || 0,
        date: f.created_at,
        packageLabel: PACKAGE_LABELS[f.package] || f.package,
      });
    });

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { data: transactions.slice(0, limit), error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch transactions' } };
  }
}

export async function getPendingDeposits(
  professionalId: string
): Promise<ServiceResponse<Booking[]>> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, service:services(*), client:users!bookings_client_id_fkey(*)')
      .eq('professional_id', professionalId)
      .eq('deposit_paid', false)
      .in('status', ['pending', 'confirmed'])
      .order('date', { ascending: true });

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return { data: data as Booking[], error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch pending deposits' } };
  }
}

// ============================================
// REVENUE ANALYTICS TYPES
// ============================================

export interface CategoryRevenue {
  category: string;
  totalRevenue: number;
  bookingCount: number;
}

export interface ServiceRevenue {
  serviceName: string;
  totalRevenue: number;
  bookingCount: number;
  avgPrice: number;
}

export interface HourlyData {
  hour: number;
  bookingCount: number;
  revenue: number;
}

export interface RetentionData {
  totalClients: number;
  repeatClients: number;
  retentionRate: number;
  avgBookingsPerClient: number;
}

// ============================================
// REVENUE ANALYTICS FUNCTIONS
// ============================================

export async function getRevenueByCategory(
  professionalId: string,
  sinceDate?: string
): Promise<ServiceResponse<CategoryRevenue[]>> {
  try {
    let query = supabase
      .from('bookings')
      .select('total_price, service:services(category)')
      .eq('professional_id', professionalId)
      .eq('status', 'completed');

    if (sinceDate) {
      query = query.gte('date', sinceDate);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    const categoryMap = new Map<string, { revenue: number; count: number }>();
    (data || []).forEach((b: any) => {
      const cat = b.service?.category || 'other';
      const entry = categoryMap.get(cat) || { revenue: 0, count: 0 };
      entry.revenue += b.total_price || 0;
      entry.count += 1;
      categoryMap.set(cat, entry);
    });

    const result: CategoryRevenue[] = [];
    categoryMap.forEach((val, category) => {
      result.push({ category, totalRevenue: val.revenue, bookingCount: val.count });
    });

    result.sort((a, b) => b.totalRevenue - a.totalRevenue);
    return { data: result, error: null };
  } catch (err) {
    console.error('Error fetching revenue by category:', err);
    return { data: null, error: { message: 'Failed to fetch category revenue' } };
  }
}

export async function getRevenueByService(
  professionalId: string,
  sinceDate?: string
): Promise<ServiceResponse<ServiceRevenue[]>> {
  try {
    let query = supabase
      .from('bookings')
      .select('total_price, service:services(name)')
      .eq('professional_id', professionalId)
      .eq('status', 'completed');

    if (sinceDate) {
      query = query.gte('date', sinceDate);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    const serviceMap = new Map<string, { revenue: number; count: number }>();
    (data || []).forEach((b: any) => {
      const name = b.service?.name || 'Unknown';
      const entry = serviceMap.get(name) || { revenue: 0, count: 0 };
      entry.revenue += b.total_price || 0;
      entry.count += 1;
      serviceMap.set(name, entry);
    });

    const result: ServiceRevenue[] = [];
    serviceMap.forEach((val, serviceName) => {
      result.push({
        serviceName,
        totalRevenue: val.revenue,
        bookingCount: val.count,
        avgPrice: val.count > 0 ? Math.round(val.revenue / val.count) : 0,
      });
    });

    result.sort((a, b) => b.totalRevenue - a.totalRevenue);
    return { data: result, error: null };
  } catch (err) {
    console.error('Error fetching revenue by service:', err);
    return { data: null, error: { message: 'Failed to fetch service revenue' } };
  }
}

export async function getPeakHoursAnalysis(
  professionalId: string,
  sinceDate?: string
): Promise<ServiceResponse<HourlyData[]>> {
  try {
    let query = supabase
      .from('bookings')
      .select('time_slot, total_price')
      .eq('professional_id', professionalId)
      .eq('status', 'completed');

    if (sinceDate) {
      query = query.gte('date', sinceDate);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    const hourMap = new Map<number, { count: number; revenue: number }>();
    for (let h = 6; h <= 22; h++) {
      hourMap.set(h, { count: 0, revenue: 0 });
    }

    (data || []).forEach((b: any) => {
      if (!b.time_slot) return;
      const hour = parseInt(b.time_slot.split(':')[0], 10);
      if (isNaN(hour)) return;
      const entry = hourMap.get(hour) || { count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += b.total_price || 0;
      hourMap.set(hour, entry);
    });

    const result: HourlyData[] = [];
    hourMap.forEach((val, hour) => {
      result.push({ hour, bookingCount: val.count, revenue: val.revenue });
    });

    result.sort((a, b) => a.hour - b.hour);
    return { data: result, error: null };
  } catch (err) {
    console.error('Error fetching peak hours:', err);
    return { data: null, error: { message: 'Failed to fetch peak hours analysis' } };
  }
}

export async function getRetentionMetrics(
  professionalId: string,
  sinceDate?: string
): Promise<ServiceResponse<RetentionData>> {
  try {
    let query = supabase
      .from('bookings')
      .select('client_id')
      .eq('professional_id', professionalId)
      .eq('status', 'completed');

    if (sinceDate) {
      query = query.gte('date', sinceDate);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    const clientCounts = new Map<string, number>();
    (data || []).forEach((b: any) => {
      if (!b.client_id) return;
      clientCounts.set(b.client_id, (clientCounts.get(b.client_id) || 0) + 1);
    });

    const totalClients = clientCounts.size;
    let repeatClients = 0;
    let totalBookings = 0;
    clientCounts.forEach((count) => {
      totalBookings += count;
      if (count > 1) repeatClients++;
    });

    return {
      data: {
        totalClients,
        repeatClients,
        retentionRate: totalClients > 0 ? Math.round((repeatClients / totalClients) * 100) : 0,
        avgBookingsPerClient: totalClients > 0 ? Math.round((totalBookings / totalClients) * 10) / 10 : 0,
      },
      error: null,
    };
  } catch (err) {
    console.error('Error fetching retention metrics:', err);
    return { data: null, error: { message: 'Failed to fetch retention metrics' } };
  }
}

// ============================================
// CLIENT FUNCTIONS
// ============================================

export async function getClientPaymentSummary(
  clientId: string
): Promise<ServiceResponse<ClientPaymentSummary>> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('total_price, deposit_paid, deposit_amount, status')
      .eq('client_id', clientId);

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    const bookings = data || [];
    const totalSpent = bookings
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + (b.total_price || 0), 0);

    const paidDeposits = bookings.filter((b) => b.deposit_paid);
    const depositsCount = paidDeposits.length;
    const depositsTotal = paidDeposits.reduce((sum, b) => sum + (b.deposit_amount || 0), 0);

    return {
      data: { totalSpent, depositsCount, depositsTotal },
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch payment summary' } };
  }
}

export async function getClientPaymentHistory(
  clientId: string
): Promise<ServiceResponse<ClientPaymentItem[]>> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, date, total_price, deposit_amount, deposit_paid, status, service:services(name), professional:professional_profiles!bookings_professional_id_fkey(user:users(name))')
      .eq('client_id', clientId)
      .order('date', { ascending: false });

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    const items: ClientPaymentItem[] = (data || []).map((b: any) => ({
      id: b.id,
      serviceName: b.service?.name || 'Service',
      professionalName: b.professional?.user?.name || 'Professional',
      date: b.date,
      totalPrice: b.total_price || 0,
      depositAmount: b.deposit_amount || 0,
      depositPaid: b.deposit_paid || false,
      status: b.status,
    }));

    return { data: items, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch payment history' } };
  }
}
