import { supabase } from './supabase';
import { Review } from '../types';

export interface ReviewWithDetails extends Omit<Review, 'reviewer'> {
  reviewer: {
    id: string;
    name: string;
    avatar: string | null;
  };
  booking?: {
    date: string;
    service: {
      name: string;
      category: string;
    };
  };
}

/**
 * Submit a review for a completed booking
 */
export async function submitReview(
  bookingId: string,
  reviewerId: string,
  revieweeId: string,
  rating: number,
  text: string,
  serviceName: string
): Promise<{ data: Review | null; error: Error | null }> {
  try {
    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        booking_id: bookingId,
        reviewer_id: reviewerId,
        reviewee_id: revieweeId,
        rating,
        text: text.trim() || null,
        service_name: serviceName,
      })
      .select()
      .single();

    if (error) throw error;

    // Recompute and update avg_rating + total_reviews on professional_profiles
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', revieweeId);

    if (allReviews && allReviews.length > 0) {
      const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      await supabase
        .from('professional_profiles')
        .update({
          avg_rating: Math.round(avg * 10) / 10,
          total_reviews: allReviews.length,
        })
        .eq('user_id', revieweeId);
    }

    return { data: data as Review, error: null };
  } catch (error) {
    console.error('Error submitting review:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get all reviews for a professional (displayed on their profile)
 */
export async function getReviewsForProfessional(
  professionalUserId: string,
  options?: {
    category?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ data: ReviewWithDetails[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('reviews')
      .select(`
        *,
        reviewer:users!reviews_reviewer_id_fkey(id, name, avatar),
        booking:bookings!reviews_booking_id_fkey(
          date,
          service:services(name, category)
        )
      `)
      .eq('reviewee_id', professionalUserId)
      .order('created_at', { ascending: false });

    // Filter by category if specified
    if (options?.category) {
      // We need to filter reviews where the service category matches
      // This requires filtering on the joined booking.service.category
      query = query.filter('booking.service.category', 'eq', options.category);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data: data as ReviewWithDetails[], error: null };
  } catch (error) {
    console.error('Error fetching reviews for professional:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get reviews written by a user
 */
export async function getReviewsByUser(
  userId: string
): Promise<{ data: ReviewWithDetails[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:users!reviews_reviewer_id_fkey(id, name, avatar),
        booking:bookings!reviews_booking_id_fkey(
          date,
          service:services(name, category)
        )
      `)
      .eq('reviewer_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data: data as ReviewWithDetails[], error: null };
  } catch (error) {
    console.error('Error fetching reviews by user:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get reviews received by a professional (for dashboard)
 */
export async function getReviewsReceived(
  professionalUserId: string,
  limit?: number
): Promise<{ data: ReviewWithDetails[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('reviews')
      .select(`
        *,
        reviewer:users!reviews_reviewer_id_fkey(id, name, avatar),
        booking:bookings!reviews_booking_id_fkey(
          date,
          service:services(name, category)
        )
      `)
      .eq('reviewee_id', professionalUserId)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data: data as ReviewWithDetails[], error: null };
  } catch (error) {
    console.error('Error fetching reviews received:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Check if a user can review a specific booking
 * Returns true if:
 * 1. Booking status is 'completed'
 * 2. User is a participant (client or professional)
 * 3. User hasn't already reviewed this booking
 */
export async function canReviewBooking(
  bookingId: string,
  userId: string
): Promise<{ canReview: boolean; reason?: string; bookingDetails?: any }> {
  try {
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        client_id,
        professional_id,
        service:services(name),
        professional:professional_profiles!bookings_professional_id_fkey(
          user_id,
          user:users(id, name, avatar)
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return { canReview: false, reason: 'Booking not found' };
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return { canReview: false, reason: 'Booking must be completed to leave a review' };
    }

    // Check if user is a participant
    const isClient = booking.client_id === userId;
    const isProfessional = (booking.professional as any)?.user_id === userId;

    if (!isClient && !isProfessional) {
      return { canReview: false, reason: 'You are not part of this booking' };
    }

    // Check if user has already reviewed
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('reviewer_id', userId)
      .single();

    if (existingReview) {
      return { canReview: false, reason: 'You have already reviewed this booking' };
    }

    // Determine the reviewee (other party)
    const revieweeId = isClient
      ? (booking.professional as any)?.user_id
      : booking.client_id;

    return {
      canReview: true,
      bookingDetails: {
        bookingId: booking.id,
        serviceName: (booking.service as any)?.name || 'Service',
        revieweeId,
        professionalName: (booking.professional as any)?.user?.name,
        professionalAvatar: (booking.professional as any)?.user?.avatar,
      },
    };
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    return { canReview: false, reason: 'Error checking eligibility' };
  }
}

/**
 * Get review for a specific booking by a user (if exists)
 */
export async function getBookingReview(
  bookingId: string,
  reviewerId: string
): Promise<{ data: Review | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('reviewer_id', reviewerId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is expected
      throw error;
    }

    return { data: data as Review | null, error: null };
  } catch (error) {
    console.error('Error fetching booking review:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get completed bookings that haven't been reviewed yet
 */
export async function getPendingReviews(
  userId: string
): Promise<{ data: any[] | null; error: Error | null }> {
  try {
    // Get all completed bookings for this user
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        date,
        client_id,
        service:services(name),
        professional:professional_profiles!bookings_professional_id_fkey(
          user_id,
          user:users(id, name, avatar)
        )
      `)
      .eq('status', 'completed')
      .eq('client_id', userId)
      .order('date', { ascending: false });

    if (bookingsError) throw bookingsError;
    if (!bookings || bookings.length === 0) {
      return { data: [], error: null };
    }

    // Get all reviews by this user
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('booking_id')
      .eq('reviewer_id', userId);

    if (reviewsError) throw reviewsError;

    // Filter out bookings that have already been reviewed
    const reviewedBookingIds = new Set(reviews?.map(r => r.booking_id) || []);
    const pendingReviews = bookings.filter(b => !reviewedBookingIds.has(b.id));

    // Transform data for easier consumption
    const transformed = pendingReviews.map(booking => ({
      bookingId: booking.id,
      bookingDate: booking.date,
      serviceName: (booking.service as any)?.name || 'Service',
      professionalId: (booking.professional as any)?.user_id,
      professionalName: (booking.professional as any)?.user?.name || 'Professional',
      professionalAvatar: (booking.professional as any)?.user?.avatar,
    }));

    return { data: transformed, error: null };
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get rating statistics for a professional
 */
export async function getRatingStats(
  professionalUserId: string
): Promise<{
  data: {
    avgRating: number;
    totalReviews: number;
    ratingBreakdown: { rating: number; count: number }[];
  } | null;
  error: Error | null;
}> {
  try {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', professionalUserId);

    if (error) throw error;

    if (!reviews || reviews.length === 0) {
      return {
        data: {
          avgRating: 0,
          totalReviews: 0,
          ratingBreakdown: [
            { rating: 5, count: 0 },
            { rating: 4, count: 0 },
            { rating: 3, count: 0 },
            { rating: 2, count: 0 },
            { rating: 1, count: 0 },
          ],
        },
        error: null,
      };
    }

    // Calculate average
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = totalRating / reviews.length;

    // Calculate breakdown
    const breakdown: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
      breakdown[r.rating]++;
    });

    return {
      data: {
        avgRating: Math.round(avgRating * 10) / 10,
        totalReviews: reviews.length,
        ratingBreakdown: [
          { rating: 5, count: breakdown[5] },
          { rating: 4, count: breakdown[4] },
          { rating: 3, count: breakdown[3] },
          { rating: 2, count: breakdown[2] },
          { rating: 1, count: breakdown[1] },
        ],
      },
      error: null,
    };
  } catch (error) {
    console.error('Error fetching rating stats:', error);
    return { data: null, error: error as Error };
  }
}
