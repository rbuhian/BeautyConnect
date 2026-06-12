import { supabase } from './supabase';
import {
  ProfessionalProfile,
  Service,
  Availability,
  Booking,
  Category,
  LocationType,
  BookingType,
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
// PROFESSIONAL PROFILE
// ============================================

export async function getProfessionalProfile(
  userId: string
): Promise<ServiceResponse<ProfessionalProfile>> {
  try {
    const { data, error } = await supabase
      .from('professional_profiles')
      .select('*, user:users(*), business:businesses(*), staff_members:staff_members(*)')
      .eq('user_id', userId)
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: data as ProfessionalProfile, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch professional profile' } };
  }
}

export async function updateProfessionalProfile(
  profileId: string,
  updates: Partial<Pick<ProfessionalProfile, 'bio' | 'categories' | 'portfolio_photos' | 'service_area' | 'location_type' | 'salon_address' | 'latitude' | 'longitude' | 'is_live'>>
): Promise<ServiceResponse<ProfessionalProfile>> {
  try {
    const { error } = await supabase
      .from('professional_profiles')
      .update(updates)
      .eq('id', profileId);

    if (error) {
      console.error('[updateProfessionalProfile] error:', error);
      return { data: null, error: { message: error.message, code: error.code } };
    }

    // Fetch the updated profile separately to avoid RLS issues on joined selects
    const { data, error: fetchError } = await supabase
      .from('professional_profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (fetchError) {
      return { data: null, error: { message: fetchError.message, code: fetchError.code } };
    }

    return { data: data as ProfessionalProfile, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to update professional profile' } };
  }
}

// ============================================
// SERVICES
// ============================================

export async function getServices(
  professionalId: string
): Promise<ServiceResponse<Service[]>> {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: data as Service[], error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch services' } };
  }
}

export async function getService(
  serviceId: string
): Promise<ServiceResponse<Service>> {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: data as Service, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch service' } };
  }
}

export async function createService(
  professionalId: string,
  service: {
    name: string;
    category: Category;
    duration_minutes: number;
    price: number;
    booking_type: BookingType;
  }
): Promise<ServiceResponse<Service>> {
  try {
    const { data, error } = await supabase
      .from('services')
      .insert({
        professional_id: professionalId,
        ...service,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: data as Service, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to create service' } };
  }
}

export async function updateService(
  serviceId: string,
  updates: Partial<Pick<Service, 'name' | 'category' | 'duration_minutes' | 'price' | 'booking_type' | 'is_active'>>
): Promise<ServiceResponse<Service>> {
  try {
    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', serviceId)
      .select()
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: data as Service, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to update service' } };
  }
}

export async function deleteService(
  serviceId: string
): Promise<ServiceResponse> {
  try {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId);

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to delete service' } };
  }
}

// ============================================
// AVAILABILITY
// ============================================

export async function getAvailability(
  professionalId: string
): Promise<ServiceResponse<Availability[]>> {
  try {
    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .eq('professional_id', professionalId)
      .order('day_of_week', { ascending: true });

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: data as Availability[], error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch availability' } };
  }
}

export async function upsertAvailability(
  professionalId: string,
  availability: {
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
  }
): Promise<ServiceResponse<Availability>> {
  try {
    const { data, error } = await supabase
      .from('availability')
      .upsert(
        {
          professional_id: professionalId,
          ...availability,
        },
        {
          onConflict: 'professional_id,day_of_week',
        }
      )
      .select()
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: data as Availability, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to update availability' } };
  }
}

export async function setAvailabilityBulk(
  professionalId: string,
  availabilities: {
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
  }[]
): Promise<ServiceResponse<Availability[]>> {
  try {
    const records = availabilities.map((a) => ({
      professional_id: professionalId,
      ...a,
    }));

    const { data, error } = await supabase
      .from('availability')
      .upsert(records, {
        onConflict: 'professional_id,day_of_week',
      })
      .select();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: data as Availability[], error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to update availability' } };
  }
}

// ============================================
// BOOKINGS (Professional view)
// ============================================

export async function getProfessionalBookings(
  professionalId: string,
  status?: string[]
): Promise<ServiceResponse<Booking[]>> {
  try {
    let query = supabase
      .from('bookings')
      .select('*, service:services(*), client:users!bookings_client_id_fkey(*), staff_member:staff_members(id, name, avatar)')
      .eq('professional_id', professionalId)
      .order('date', { ascending: true })
      .order('time_slot', { ascending: true });

    if (status && status.length > 0) {
      query = query.in('status', status);
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

export async function getUpcomingBookings(
  professionalId: string
): Promise<ServiceResponse<Booking[]>> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('bookings')
      .select('*, service:services(*), client:users!bookings_client_id_fkey(*), staff_member:staff_members(id, name, avatar)')
      .eq('professional_id', professionalId)
      .in('status', ['pending', 'confirmed'])
      .gte('date', today)
      .order('date', { ascending: true })
      .order('time_slot', { ascending: true });

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: data as Booking[], error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch upcoming bookings' } };
  }
}

/**
 * Get completed bookings that haven't been reviewed by the professional yet
 */
export async function getCompletedBookingsNeedingReview(
  professionalUserId: string
): Promise<ServiceResponse<Booking[]>> {
  try {
    // Get all completed bookings where professional is the service provider
    const { data: completedBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(*),
        client:users!bookings_client_id_fkey(*),
        staff_member:staff_members(id, name, avatar),
        professional:professional_profiles!bookings_professional_id_fkey(user_id)
      `)
      .eq('status', 'completed')
      .order('date', { ascending: false })
      .limit(20); // Get last 20 completed bookings

    if (bookingsError) {
      return { data: null, error: { message: bookingsError.message, code: bookingsError.code } };
    }

    if (!completedBookings || completedBookings.length === 0) {
      return { data: [], error: null };
    }

    // Filter to only bookings where this professional was the provider
    const professionalBookings = completedBookings.filter(
      (booking: any) => booking.professional?.user_id === professionalUserId
    );

    if (professionalBookings.length === 0) {
      return { data: [], error: null };
    }

    // Get all reviews written by this professional
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('booking_id')
      .eq('reviewer_id', professionalUserId);

    if (reviewsError) {
      return { data: null, error: { message: reviewsError.message, code: reviewsError.code } };
    }

    // Filter out bookings that have already been reviewed
    const reviewedBookingIds = new Set(reviews?.map(r => r.booking_id) || []);
    const needingReview = professionalBookings.filter(
      booking => !reviewedBookingIds.has(booking.id)
    );

    return { data: needingReview as Booking[], error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch completed bookings needing review' } };
  }
}

export async function updateBookingStatus(
  bookingId: string,
  status: 'confirmed' | 'completed' | 'cancelled',
  cancelledBy?: string
): Promise<ServiceResponse<Booking>> {
  try {
    const updates: Record<string, unknown> = { status };

    if (status === 'cancelled' && cancelledBy) {
      updates.cancelled_at = new Date().toISOString();
      updates.cancelled_by = cancelledBy;
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)
      .select('*, service:services(*), client:users!bookings_client_id_fkey(*), staff_member:staff_members(id, name, avatar)')
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: data as Booking, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to update booking status' } };
  }
}

export async function getBookingByIdForProfessional(
  bookingId: string
): Promise<ServiceResponse<Booking>> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, service:services(*), client:users!bookings_client_id_fkey(*), staff_member:staff_members(id, name, avatar)')
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

// ============================================
// STATS
// ============================================

export async function getProfessionalStats(
  professionalId: string
): Promise<ServiceResponse<{
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  totalEarnings: number;
}>> {
  try {
    // Get all bookings for stats
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('status, total_price')
      .eq('professional_id', professionalId);

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    const stats = {
      totalBookings: bookings?.length || 0,
      completedBookings: bookings?.filter((b) => b.status === 'completed').length || 0,
      pendingBookings: bookings?.filter((b) => b.status === 'pending').length || 0,
      totalEarnings: bookings
        ?.filter((b) => b.status === 'completed')
        .reduce((sum, b) => sum + (b.total_price || 0), 0) || 0,
    };

    return { data: stats, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch stats' } };
  }
}
