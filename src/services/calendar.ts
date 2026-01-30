import { supabase } from './supabase';
import { Booking, BookingStatus } from '../types';

export interface ServiceError {
  message: string;
  code?: string;
}

export interface ServiceResponse<T = void> {
  data: T | null;
  error: ServiceError | null;
}

/**
 * Get bookings for a date range (for professional)
 */
export async function getBookingsByDateRange(
  professionalId: string,
  startDate: string,
  endDate: string,
  status?: BookingStatus[]
): Promise<ServiceResponse<Booking[]>> {
  try {
    let query = supabase
      .from('bookings')
      .select(
        `
        *,
        service:services(*),
        client:users!bookings_client_id_fkey(*),
        staff_member:staff_members(*)
      `
      )
      .eq('professional_id', professionalId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('time_slot', { ascending: true });

    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bookings by date range:', error);
      return { data: null, error };
    }

    return { data: data as Booking[], error: null };
  } catch (err) {
    console.error('Unexpected error in getBookingsByDateRange:', err);
    return {
      data: null,
      error: { message: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' },
    };
  }
}

/**
 * Get bookings for a specific date (for professional)
 */
export async function getBookingsByDate(
  professionalId: string,
  date: string,
  status?: BookingStatus[]
): Promise<ServiceResponse<Booking[]>> {
  try {
    let query = supabase
      .from('bookings')
      .select(
        `
        *,
        service:services(*),
        client:users!bookings_client_id_fkey(*),
        staff_member:staff_members(*)
      `
      )
      .eq('professional_id', professionalId)
      .eq('date', date)
      .order('time_slot', { ascending: true });

    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    const { data, error} = await query;

    if (error) {
      console.error('Error fetching bookings by date:', error);
      return { data: null, error };
    }

    return { data: data as Booking[], error: null };
  } catch (err) {
    console.error('Unexpected error in getBookingsByDate:', err);
    return {
      data: null,
      error: { message: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' },
    };
  }
}

/**
 * Get bookings for a business (salon) within a date range
 * Combines bookings from all staff members
 */
export async function getBusinessBookingsByDateRange(
  businessId: string,
  startDate: string,
  endDate: string,
  staffMemberIds?: string[],
  status?: BookingStatus[]
): Promise<ServiceResponse<Booking[]>> {
  try {
    let query = supabase
      .from('bookings')
      .select(
        `
        *,
        service:services(*),
        client:users!bookings_client_id_fkey(*),
        staff_member:staff_members(*)
      `
      )
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('time_slot', { ascending: true });

    // Filter by business through staff_member relationship
    if (staffMemberIds && staffMemberIds.length > 0) {
      query = query.in('staff_member_id', staffMemberIds);
    } else {
      // Get all staff bookings for this business
      const { data: staffMembers } = await supabase
        .from('staff_members')
        .select('id')
        .eq('business_id', businessId);

      if (staffMembers && staffMembers.length > 0) {
        const ids = staffMembers.map(s => s.id);
        query = query.in('staff_member_id', ids);
      } else {
        // No staff members, return empty
        return { data: [], error: null };
      }
    }

    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching business bookings by date range:', error);
      return { data: null, error };
    }

    return { data: data as Booking[], error: null };
  } catch (err) {
    console.error('Unexpected error in getBusinessBookingsByDateRange:', err);
    return {
      data: null,
      error: { message: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' },
    };
  }
}

/**
 * Block a date for a professional
 * Note: For staff members, use addStaffBlockedDate from business.ts
 */
export async function blockProfessionalDate(
  professionalId: string,
  date: string,
  reason?: string
): Promise<ServiceResponse<void>> {
  try {
    // For now, we'll use the staff_blocked_dates table
    // In a production app, you might want a separate professional_blocked_dates table

    // This is a placeholder - you would implement professional-level blocking
    // based on your database schema
    console.warn('blockProfessionalDate not fully implemented - use staff blocking for now');

    return { data: undefined, error: null };
  } catch (err) {
    console.error('Unexpected error in blockProfessionalDate:', err);
    return {
      data: null,
      error: { message: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' },
    };
  }
}
