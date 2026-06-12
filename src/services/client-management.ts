import { supabase } from './supabase';
import { Booking } from '../types';
import { ServiceResponse } from './professional';

// ============================================
// TYPES
// ============================================

export interface ClientSummary {
  clientId: string;
  name: string;
  avatar: string | null;
  email: string;
  totalBookings: number;
  totalRevenue: number;
  lastBookingDate: string;
  favoriteService: string | null;
}

export interface ClientDetailStats {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  avgBookingValue: number;
  avgRatingGiven: number | null;
  favoriteService: string | null;
  firstBookingDate: string;
  lastBookingDate: string;
}

// ============================================
// FUNCTIONS
// ============================================

export async function getClientList(
  professionalId: string
): Promise<ServiceResponse<ClientSummary[]>> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('client_id, total_price, date, status, service:services(name), client:users!bookings_client_id_fkey(id, name, avatar, email)')
      .eq('professional_id', professionalId)
      .order('date', { ascending: false });

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    // Group bookings by client
    const clientMap = new Map<string, {
      name: string;
      avatar: string | null;
      email: string;
      bookings: any[];
    }>();

    (data || []).forEach((b: any) => {
      const clientId = b.client_id;
      if (!clientId) return;

      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          name: b.client?.name || 'Client',
          avatar: b.client?.avatar || null,
          email: b.client?.email || '',
          bookings: [],
        });
      }
      clientMap.get(clientId)!.bookings.push(b);
    });

    // Build summaries
    const clients: ClientSummary[] = [];
    clientMap.forEach((info, clientId) => {
      const completed = info.bookings.filter((b: any) => b.status === 'completed');
      const totalRevenue = completed.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0);

      // Find most common service
      const serviceCounts = new Map<string, number>();
      info.bookings.forEach((b: any) => {
        const name = b.service?.name;
        if (name) {
          serviceCounts.set(name, (serviceCounts.get(name) || 0) + 1);
        }
      });
      let favoriteService: string | null = null;
      let maxCount = 0;
      serviceCounts.forEach((count, name) => {
        if (count > maxCount) {
          maxCount = count;
          favoriteService = name;
        }
      });

      const dates = info.bookings.map((b: any) => b.date).sort();
      const lastBookingDate = dates[dates.length - 1] || '';

      clients.push({
        clientId,
        name: info.name,
        avatar: info.avatar,
        email: info.email,
        totalBookings: info.bookings.length,
        totalRevenue,
        lastBookingDate,
        favoriteService,
      });
    });

    // Sort by last booking date descending
    clients.sort((a, b) => new Date(b.lastBookingDate).getTime() - new Date(a.lastBookingDate).getTime());

    return { data: clients, error: null };
  } catch (err) {
    console.error('Error fetching client list:', err);
    return { data: null, error: { message: 'Failed to fetch client list' } };
  }
}

export async function getClientBookingHistory(
  professionalId: string,
  clientId: string
): Promise<ServiceResponse<Booking[]>> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, service:services(*), client:users!bookings_client_id_fkey(*)')
      .eq('professional_id', professionalId)
      .eq('client_id', clientId)
      .order('date', { ascending: false });

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return { data: data as Booking[], error: null };
  } catch (err) {
    console.error('Error fetching client booking history:', err);
    return { data: null, error: { message: 'Failed to fetch booking history' } };
  }
}

export async function getClientStats(
  professionalId: string,
  clientId: string
): Promise<ServiceResponse<ClientDetailStats>> {
  try {
    const [bookingsRes, reviewsRes] = await Promise.all([
      supabase
        .from('bookings')
        .select('total_price, date, status, service:services(name)')
        .eq('professional_id', professionalId)
        .eq('client_id', clientId)
        .order('date', { ascending: true }),
      supabase
        .from('reviews')
        .select('rating')
        .eq('reviewer_id', clientId)
        .eq('reviewee_id', professionalId),
    ]);

    if (bookingsRes.error) {
      return { data: null, error: { message: bookingsRes.error.message } };
    }

    const bookings = bookingsRes.data || [];
    const reviews = reviewsRes.data || [];

    const completed = bookings.filter((b: any) => b.status === 'completed');
    const cancelled = bookings.filter((b: any) => b.status === 'cancelled');
    const totalRevenue = completed.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0);

    // Average rating given by this client
    let avgRatingGiven: number | null = null;
    if (reviews.length > 0) {
      avgRatingGiven = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;
    }

    // Favorite service
    const serviceCounts = new Map<string, number>();
    bookings.forEach((b: any) => {
      const name = b.service?.name;
      if (name) {
        serviceCounts.set(name, (serviceCounts.get(name) || 0) + 1);
      }
    });
    let favoriteService: string | null = null;
    let maxCount = 0;
    serviceCounts.forEach((count, name) => {
      if (count > maxCount) {
        maxCount = count;
        favoriteService = name;
      }
    });

    const dates = bookings.map((b: any) => b.date).filter(Boolean);

    return {
      data: {
        totalBookings: bookings.length,
        completedBookings: completed.length,
        cancelledBookings: cancelled.length,
        totalRevenue,
        avgBookingValue: completed.length > 0 ? totalRevenue / completed.length : 0,
        avgRatingGiven,
        favoriteService,
        firstBookingDate: dates[0] || '',
        lastBookingDate: dates[dates.length - 1] || '',
      },
      error: null,
    };
  } catch (err) {
    console.error('Error fetching client stats:', err);
    return { data: null, error: { message: 'Failed to fetch client stats' } };
  }
}
