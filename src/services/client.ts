import { supabase } from './supabase';
import {
  ProfessionalProfile,
  Service,
  Availability,
  Booking,
  Review,
  ProfessionalFilters,
  Category,
} from '../types';
import { haversineDistance } from '../utils/distance';

export interface ServiceError {
  message: string;
  code?: string;
}

export interface ServiceResponse<T = void> {
  data: T | null;
  error: ServiceError | null;
}

// ============================================
// DISCOVER PROFESSIONALS
// ============================================

export interface ProfessionalWithDetails extends Omit<ProfessionalProfile, 'user'> {
  user: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
  services: Service[];
  min_price?: number;
  max_price?: number;
  distance?: number; // km from user, calculated client-side
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export async function getDiscoverProfessionals(
  filters?: ProfessionalFilters,
  userLocation?: UserLocation,
  blockedUserIds?: string[]
): Promise<ServiceResponse<ProfessionalWithDetails[]>> {
  try {
    let query = supabase
      .from('professional_profiles')
      .select(`
        *,
        user:users!professional_profiles_user_id_fkey(id, name, avatar),
        services:services(*)
      `)
      .eq('is_live', true);

    // Exclude blocked professionals
    if (blockedUserIds && blockedUserIds.length > 0) {
      query = query.not('user_id', 'in', `(${blockedUserIds.join(',')})`);
    }

    // Apply category filter
    if (filters?.category) {
      query = query.contains('categories', [filters.category]);
    }

    // Apply location type filter
    if (filters?.location_type) {
      query = query.or(`location_type.eq.${filters.location_type},location_type.eq.both`);
    }

    const { data, error } = await query.order('avg_rating', { ascending: false });

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    // Fetch review stats for all professionals in one query
    const userIds = (data || []).map((p) => p.user_id).filter(Boolean);
    const reviewStatsMap: Record<string, { avg: number; count: number }> = {};
    if (userIds.length > 0) {
      const { data: reviewRows } = await supabase
        .from('reviews')
        .select('reviewee_id, rating')
        .in('reviewee_id', userIds);
      if (reviewRows) {
        reviewRows.forEach((r: any) => {
          if (!reviewStatsMap[r.reviewee_id]) {
            reviewStatsMap[r.reviewee_id] = { avg: 0, count: 0 };
          }
          reviewStatsMap[r.reviewee_id].count += 1;
          reviewStatsMap[r.reviewee_id].avg += r.rating;
        });
        Object.keys(reviewStatsMap).forEach((id) => {
          const s = reviewStatsMap[id];
          s.avg = Math.round((s.avg / s.count) * 10) / 10;
        });
      }
    }

    // Calculate min/max prices and distance
    let professionals = (data || []).map((pro) => {
      const activeServices = (pro.services || []).filter((s: Service) => s.is_active);
      const prices = activeServices.map((s: Service) => s.price);

      let distance: number | undefined;
      if (userLocation && pro.latitude != null && pro.longitude != null) {
        distance = haversineDistance(
          userLocation.latitude,
          userLocation.longitude,
          pro.latitude,
          pro.longitude
        );
      }

      const stats = reviewStatsMap[pro.user_id];
      return {
        ...pro,
        min_price: prices.length > 0 ? Math.min(...prices) : 0,
        max_price: prices.length > 0 ? Math.max(...prices) : 0,
        avg_rating: stats ? stats.avg : (pro.avg_rating ?? 0),
        total_reviews: stats ? stats.count : (pro.total_reviews ?? 0),
        distance,
      };
    }) as ProfessionalWithDetails[];

    // Filter by price range (PHP values)
    if (filters?.price_range) {
      professionals = professionals.filter((pro) => {
        const avgPrice = (pro.min_price! + pro.max_price!) / 2;
        switch (filters.price_range) {
          case '₱':
            return avgPrice <= 1000; // Budget: up to ₱1,000
          case '₱₱':
            return avgPrice > 1000 && avgPrice <= 3000; // Mid-range: ₱1,000 - ₱3,000
          case '₱₱₱':
            return avgPrice > 3000; // Premium: above ₱3,000
          default:
            return true;
        }
      });
    }

    // Filter by max distance
    if (filters?.max_distance_km && userLocation) {
      professionals = professionals.filter(
        (pro) => pro.distance != null && pro.distance <= filters.max_distance_km!
      );
    }

    // Sort: if user location available, sort by distance (nearest first),
    // with professionals without coordinates at the end
    if (userLocation) {
      professionals.sort((a, b) => {
        if (a.distance != null && b.distance != null) return a.distance - b.distance;
        if (a.distance != null) return -1;
        if (b.distance != null) return 1;
        return (b.avg_rating || 0) - (a.avg_rating || 0);
      });
    }

    return { data: professionals, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch professionals' } };
  }
}

export async function searchProfessionals(
  searchText: string
): Promise<ServiceResponse<ProfessionalWithDetails[]>> {
  try {
    const { data, error } = await supabase
      .from('professional_profiles')
      .select(`
        *,
        user:users!professional_profiles_user_id_fkey(id, name, avatar),
        services:services(*)
      `)
      .eq('is_live', true)
      .or(`bio.ilike.%${searchText}%,service_area.ilike.%${searchText}%,salon_address.ilike.%${searchText}%`);

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    // Also search by user name
    const { data: userMatches } = await supabase
      .from('users')
      .select('id')
      .ilike('name', `%${searchText}%`);

    const userIds = userMatches?.map((u) => u.id) || [];

    const { data: nameMatches } = await supabase
      .from('professional_profiles')
      .select(`
        *,
        user:users!professional_profiles_user_id_fkey(id, name, avatar),
        services:services(*)
      `)
      .eq('is_live', true)
      .in('user_id', userIds);

    // Combine and dedupe results
    const allResults = [...(data || []), ...(nameMatches || [])];
    const uniqueResults = allResults.filter(
      (pro, index, self) => index === self.findIndex((p) => p.id === pro.id)
    );

    const professionals = uniqueResults.map((pro) => {
      const activeServices = (pro.services || []).filter((s: Service) => s.is_active);
      const prices = activeServices.map((s: Service) => s.price);
      return {
        ...pro,
        min_price: prices.length > 0 ? Math.min(...prices) : 0,
        max_price: prices.length > 0 ? Math.max(...prices) : 0,
      };
    }) as ProfessionalWithDetails[];

    return { data: professionals, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to search professionals' } };
  }
}

// ============================================
// PROFESSIONAL PROFILE VIEW
// ============================================

export async function getProfessionalById(
  professionalId: string
): Promise<ServiceResponse<ProfessionalWithDetails>> {
  try {
    const { data, error } = await supabase
      .from('professional_profiles')
      .select(`
        *,
        user:users!professional_profiles_user_id_fkey(id, name, avatar, email),
        services:services(*)
      `)
      .eq('id', professionalId)
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    const activeServices = (data.services || []).filter((s: Service) => s.is_active);
    const prices = activeServices.map((s: Service) => s.price);

    return {
      data: {
        ...data,
        min_price: prices.length > 0 ? Math.min(...prices) : 0,
        max_price: prices.length > 0 ? Math.max(...prices) : 0,
      } as ProfessionalWithDetails,
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch professional profile' } };
  }
}

export async function getProfessionalReviews(
  professionalId: string
): Promise<ServiceResponse<Review[]>> {
  try {
    // Get user_id for the professional
    const { data: profile } = await supabase
      .from('professional_profiles')
      .select('user_id')
      .eq('id', professionalId)
      .single();

    if (!profile) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('reviews')
      .select('*, reviewer:users!reviews_reviewer_id_fkey(id, name, avatar)')
      .eq('reviewee_id', profile.user_id)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: data as Review[], error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch reviews' } };
  }
}

export async function getProfessionalAvailability(
  professionalId: string
): Promise<ServiceResponse<Availability[]>> {
  try {
    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('is_available', true)
      .order('day_of_week', { ascending: true });

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: data as Availability[], error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch availability' } };
  }
}

// ============================================
// FAVORITES
// ============================================

export async function getFavorites(
  userId: string
): Promise<ServiceResponse<string[]>> {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('professional_id')
      .eq('user_id', userId);

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: data.map((f) => f.professional_id), error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch favorites' } };
  }
}

export async function getFavoriteProfessionals(
  userId: string
): Promise<ServiceResponse<ProfessionalWithDetails[]>> {
  try {
    const { data: favorites, error: favError } = await supabase
      .from('favorites')
      .select('professional_id')
      .eq('user_id', userId);

    if (favError) {
      return { data: null, error: { message: favError.message, code: favError.code } };
    }

    if (!favorites || favorites.length === 0) {
      return { data: [], error: null };
    }

    const professionalIds = favorites.map((f) => f.professional_id);

    const { data, error } = await supabase
      .from('professional_profiles')
      .select(`
        *,
        user:users!professional_profiles_user_id_fkey(id, name, avatar),
        services:services(*)
      `)
      .in('id', professionalIds);

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    const professionals = (data || []).map((pro) => {
      const activeServices = (pro.services || []).filter((s: Service) => s.is_active);
      const prices = activeServices.map((s: Service) => s.price);
      return {
        ...pro,
        min_price: prices.length > 0 ? Math.min(...prices) : 0,
        max_price: prices.length > 0 ? Math.max(...prices) : 0,
      };
    }) as ProfessionalWithDetails[];

    return { data: professionals, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch favorite professionals' } };
  }
}

export async function toggleFavorite(
  userId: string,
  professionalId: string,
  isFavorite: boolean
): Promise<ServiceResponse> {
  try {
    if (isFavorite) {
      const { error } = await supabase.from('favorites').insert({
        user_id: userId,
        professional_id: professionalId,
      });

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } };
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('professional_id', professionalId);

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } };
      }
    }

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to update favorite' } };
  }
}

// ============================================
// BOOKINGS (Client view)
// ============================================

export async function getClientBookings(
  clientId: string,
  type: 'upcoming' | 'past'
): Promise<ServiceResponse<Booking[]>> {
  try {
    const today = new Date().toISOString().split('T')[0];

    let query = supabase
      .from('bookings')
      .select(`
        *,
        service:services(*),
        professional:professional_profiles(
          *,
          user:users!professional_profiles_user_id_fkey(id, name, avatar)
        ),
        staff_member:staff_members(id, name, avatar)
      `)
      .eq('client_id', clientId);

    if (type === 'upcoming') {
      query = query
        .in('status', ['pending', 'confirmed'])
        .gte('date', today)
        .order('date', { ascending: true });
    } else {
      query = query
        .or(`status.eq.completed,status.eq.cancelled,date.lt.${today}`)
        .order('date', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: data as Booking[], error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch bookings' } };
  }
}

export async function getBookingById(
  bookingId: string
): Promise<ServiceResponse<Booking>> {
  try {
    // First fetch booking + service only (minimal, avoids join RLS issues)
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(*),
        professional:professional_profiles(
          id, user_id, bio, categories, location_type, service_area,
          salon_address, is_live, avg_rating, total_reviews,
          user:users!professional_profiles_user_id_fkey(id, name, avatar)
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error) {
      console.error('getBookingById error:', error.message, error.code);
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: data as Booking, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch booking' } };
  }
}

export async function createBooking(
  booking: {
    client_id: string;
    professional_id: string;
    service_id: string;
    date: string;
    time_slot: string;
    location_type: 'home' | 'salon';
    client_address?: string;
    deposit_amount: number;
    total_price: number;
    staff_member_id?: string; // Optional - if null, auto-assigned for salons
  }
): Promise<ServiceResponse<Booking>> {
  try {
    // Get service to check booking type
    const { data: service } = await supabase
      .from('services')
      .select('booking_type')
      .eq('id', booking.service_id)
      .single();

    const status = service?.booking_type === 'instant' ? 'confirmed' : 'pending';

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        ...booking,
        staff_member_id: booking.staff_member_id || null, // DB trigger will auto-assign if null for salons
        status,
        deposit_paid: false, // Will be updated after payment
      })
      .select(`
        *,
        service:services(*),
        professional:professional_profiles(
          *,
          user:users!professional_profiles_user_id_fkey(id, name, avatar)
        ),
        staff_member:staff_members(id, name, avatar)
      `)
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: data as Booking, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to create booking' } };
  }
}

export async function cancelBooking(
  bookingId: string,
  cancelledBy: string
): Promise<ServiceResponse<Booking>> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: cancelledBy,
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: data as Booking, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to cancel booking' } };
  }
}

// ============================================
// TIME SLOTS
// ============================================

export async function getAvailableTimeSlots(
  professionalId: string,
  date: string,
  serviceDuration: number
): Promise<ServiceResponse<string[]>> {
  try {
    // Get existing bookings for that date to filter out already-booked slots
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('time_slot, service:services(duration_minutes)')
      .eq('professional_id', professionalId)
      .eq('date', date)
      .in('status', ['pending', 'confirmed']);

    // When booking for today, exclude slots whose start time has already passed.
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    const isToday = date === todayStr;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // Fetch the professional's blocked times for this date.
    const { data: blocks } = await supabase
      .from('professional_blocked_dates')
      .select('start_time, end_time')
      .eq('professional_id', professionalId)
      .eq('date', date);

    // A block with no times blocks the whole day → no slots available.
    const wholeDayBlocked = (blocks || []).some((b: any) => !b.start_time || !b.end_time);
    if (wholeDayBlocked) {
      return { data: [], error: null };
    }

    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const blockedRanges = (blocks || []).map((b: any) => ({
      start: toMinutes(b.start_time),
      end: toMinutes(b.end_time),
    }));

    // Generate all 24-hour slots (00:00 - 23:30)
    const slots: string[] = [];
    for (let hour = 0; hour <= 23; hour++) {
      for (const minutes of ['00', '30']) {
        const slot = `${hour.toString().padStart(2, '0')}:${minutes}`;
        const slotMinutes = hour * 60 + parseInt(minutes);
        const slotEndMinutes = slotMinutes + serviceDuration;

        // Skip past times for same-day bookings.
        if (isToday && slotMinutes <= nowMinutes) {
          continue;
        }

        // Skip slots that overlap a blocked time range.
        const inBlockedRange = blockedRanges.some(
          (r) => slotMinutes < r.end && slotEndMinutes > r.start
        );
        if (inBlockedRange) {
          continue;
        }

        const hasConflict = (existingBookings || []).some((booking) => {
          const [bh, bm] = booking.time_slot.split(':').map(Number);
          const bookingStart = bh * 60 + bm;
          const bookingEnd = bookingStart + ((booking.service as any)?.duration_minutes || 60);
          return (
            (slotMinutes >= bookingStart && slotMinutes < bookingEnd) ||
            (slotEndMinutes > bookingStart && slotEndMinutes <= bookingEnd) ||
            (slotMinutes <= bookingStart && slotEndMinutes >= bookingEnd)
          );
        });

        if (!hasConflict) {
          slots.push(slot);
        }
      }
    }

    return { data: slots, error: null };
  } catch (err) {
    console.error('Error fetching time slots:', err);
    return { data: null, error: { message: 'Failed to fetch time slots' } };
  }
}

// ============================================
// REVIEWS
// ============================================

export async function createReview(
  review: {
    booking_id: string;
    reviewer_id: string;
    reviewee_id: string;
    rating: number;
    text: string;
    service_name: string;
  }
): Promise<ServiceResponse<Review>> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .insert(review)
      .select()
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    // Update professional's average rating
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', review.reviewee_id);

    if (reviews && reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      await supabase
        .from('professional_profiles')
        .update({
          avg_rating: avgRating,
          total_reviews: reviews.length,
        })
        .eq('user_id', review.reviewee_id);
    }

    return { data: data as Review, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to create review' } };
  }
}

export async function hasReviewedBooking(
  bookingId: string,
  userId: string
): Promise<ServiceResponse<boolean>> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('reviewer_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: !!data, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to check review status' } };
  }
}
