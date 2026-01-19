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

export interface ProfessionalWithDetails extends ProfessionalProfile {
  user: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
  services: Service[];
  min_price?: number;
  max_price?: number;
}

export async function getDiscoverProfessionals(
  filters?: ProfessionalFilters
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

    // Calculate min/max prices and filter by price range
    let professionals = (data || []).map((pro) => {
      const activeServices = (pro.services || []).filter((s: Service) => s.is_active);
      const prices = activeServices.map((s: Service) => s.price);
      return {
        ...pro,
        min_price: prices.length > 0 ? Math.min(...prices) : 0,
        max_price: prices.length > 0 ? Math.max(...prices) : 0,
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
      .or(`bio.ilike.%${searchText}%,service_area.ilike.%${searchText}%`);

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
        user:users!professional_profiles_user_id_fkey(id, name, avatar, phone),
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
  clientId: string
): Promise<ServiceResponse<string[]>> {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('professional_id')
      .eq('client_id', clientId);

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: data.map((f) => f.professional_id), error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch favorites' } };
  }
}

export async function toggleFavorite(
  clientId: string,
  professionalId: string,
  isFavorite: boolean
): Promise<ServiceResponse> {
  try {
    if (isFavorite) {
      const { error } = await supabase.from('favorites').insert({
        client_id: clientId,
        professional_id: professionalId,
      });

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } };
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('client_id', clientId)
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
        )
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
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(*),
        professional:professional_profiles(
          *,
          user:users!professional_profiles_user_id_fkey(id, name, avatar, phone)
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error) {
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
        status,
        deposit_paid: false, // Will be updated after payment
      })
      .select(`
        *,
        service:services(*),
        professional:professional_profiles(
          *,
          user:users!professional_profiles_user_id_fkey(id, name, avatar)
        )
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
    // Get day of week (0-6)
    const dayOfWeek = new Date(date).getDay();

    // Get availability for that day
    const { data: availability } = await supabase
      .from('availability')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true)
      .single();

    if (!availability) {
      return { data: [], error: null };
    }

    // Get existing bookings for that date
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('time_slot, service:services(duration_minutes)')
      .eq('professional_id', professionalId)
      .eq('date', date)
      .in('status', ['pending', 'confirmed']);

    // Generate available time slots
    const slots: string[] = [];
    const startHour = parseInt(availability.start_time.split(':')[0]);
    const endHour = parseInt(availability.end_time.split(':')[0]);

    for (let hour = startHour; hour < endHour; hour++) {
      for (const minutes of ['00', '30']) {
        const slot = `${hour.toString().padStart(2, '0')}:${minutes}`;

        // Check if slot conflicts with existing bookings
        const slotMinutes = hour * 60 + parseInt(minutes);
        const slotEndMinutes = slotMinutes + serviceDuration;

        const hasConflict = (existingBookings || []).some((booking) => {
          const bookingHour = parseInt(booking.time_slot.split(':')[0]);
          const bookingMinutes = parseInt(booking.time_slot.split(':')[1]);
          const bookingStart = bookingHour * 60 + bookingMinutes;
          const bookingEnd = bookingStart + ((booking.service as any)?.duration_minutes || 60);

          return (
            (slotMinutes >= bookingStart && slotMinutes < bookingEnd) ||
            (slotEndMinutes > bookingStart && slotEndMinutes <= bookingEnd) ||
            (slotMinutes <= bookingStart && slotEndMinutes >= bookingEnd)
          );
        });

        // Don't show slots that would extend past closing time
        const wouldExceedEndTime = slotEndMinutes > endHour * 60;

        if (!hasConflict && !wouldExceedEndTime) {
          slots.push(slot);
        }
      }
    }

    return { data: slots, error: null };
  } catch (err) {
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
  bookingId: string
): Promise<ServiceResponse<boolean>> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', bookingId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: !!data, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to check review status' } };
  }
}
