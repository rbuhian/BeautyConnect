import { supabase } from './supabase';
import {
  Business,
  BusinessType,
  StaffMember,
  StaffAvailability,
  StaffBlockedDate,
  Category,
} from '../types';

// ============================================
// BUSINESS FUNCTIONS
// ============================================

/**
 * Create a new business for a professional
 */
export async function createBusiness(
  professionalId: string,
  data: {
    business_name: string;
    business_type: BusinessType;
    logo?: string;
    description?: string;
  }
): Promise<Business> {
  const { data: business, error } = await supabase
    .from('businesses')
    .insert({
      professional_id: professionalId,
      business_name: data.business_name,
      business_type: data.business_type,
      logo: data.logo || null,
      description: data.description || null,
    })
    .select()
    .single();

  if (error) throw error;
  return business;
}

/**
 * Get business by professional ID
 */
export async function getBusinessByProfessionalId(
  professionalId: string
): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('professional_id', professionalId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
}

/**
 * Update business details
 */
export async function updateBusiness(
  businessId: string,
  data: Partial<{
    business_name: string;
    business_type: BusinessType;
    logo: string | null;
    description: string | null;
  }>
): Promise<Business> {
  const { data: business, error } = await supabase
    .from('businesses')
    .update(data)
    .eq('id', businessId)
    .select()
    .single();

  if (error) throw error;
  return business;
}

/**
 * Delete business (will cascade delete all staff members)
 */
export async function deleteBusiness(businessId: string): Promise<void> {
  const { error } = await supabase
    .from('businesses')
    .delete()
    .eq('id', businessId);

  if (error) throw error;
}

// ============================================
// STAFF MEMBER FUNCTIONS
// ============================================

/**
 * Get all staff members for a business
 */
export async function getStaffMembers(businessId: string): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from('staff_members')
    .select(`
      *,
      user:users(id, name, avatar, email)
    `)
    .eq('business_id', businessId)
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Get active staff members for a business
 */
export async function getActiveStaffMembers(businessId: string): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from('staff_members')
    .select(`
      *,
      user:users(id, name, avatar, email)
    `)
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Get a single staff member by ID
 */
export async function getStaffMemberById(staffMemberId: string): Promise<StaffMember | null> {
  const { data, error } = await supabase
    .from('staff_members')
    .select(`
      *,
      user:users(id, name, avatar, email)
    `)
    .eq('id', staffMemberId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Create a new staff member
 */
export async function createStaffMember(
  businessId: string,
  data: {
    name: string;
    avatar?: string;
    specialties: Category[];
    bio?: string;
    user_id?: string; // Link to existing user account (optional)
  }
): Promise<StaffMember> {
  const { data: staffMember, error } = await supabase
    .from('staff_members')
    .insert({
      business_id: businessId,
      name: data.name,
      avatar: data.avatar || null,
      specialties: data.specialties,
      bio: data.bio || null,
      user_id: data.user_id || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;

  // Create default availability schedule for the staff member (Mon-Fri, 9am-6pm)
  const defaultAvailability = [
    { staff_member_id: staffMember.id, day_of_week: 0, is_available: false, start_time: '09:00:00', end_time: '18:00:00' }, // Sunday
    { staff_member_id: staffMember.id, day_of_week: 1, is_available: true, start_time: '09:00:00', end_time: '18:00:00' },  // Monday
    { staff_member_id: staffMember.id, day_of_week: 2, is_available: true, start_time: '09:00:00', end_time: '18:00:00' },  // Tuesday
    { staff_member_id: staffMember.id, day_of_week: 3, is_available: true, start_time: '09:00:00', end_time: '18:00:00' },  // Wednesday
    { staff_member_id: staffMember.id, day_of_week: 4, is_available: true, start_time: '09:00:00', end_time: '18:00:00' },  // Thursday
    { staff_member_id: staffMember.id, day_of_week: 5, is_available: true, start_time: '09:00:00', end_time: '18:00:00' },  // Friday
    { staff_member_id: staffMember.id, day_of_week: 6, is_available: false, start_time: '09:00:00', end_time: '18:00:00' }, // Saturday
  ];

  await supabase.from('staff_availability').insert(defaultAvailability);

  return staffMember;
}

/**
 * Update staff member
 */
export async function updateStaffMember(
  staffMemberId: string,
  data: Partial<{
    name: string;
    avatar: string | null;
    specialties: Category[];
    bio: string | null;
    is_active: boolean;
  }>
): Promise<StaffMember> {
  const { data: staffMember, error } = await supabase
    .from('staff_members')
    .update(data)
    .eq('id', staffMemberId)
    .select()
    .single();

  if (error) throw error;
  return staffMember;
}

/**
 * Delete staff member
 */
export async function deleteStaffMember(staffMemberId: string): Promise<void> {
  const { error } = await supabase
    .from('staff_members')
    .delete()
    .eq('id', staffMemberId);

  if (error) throw error;
}

// ============================================
// STAFF AVAILABILITY FUNCTIONS
// ============================================

/**
 * Get availability for a staff member
 */
export async function getStaffAvailability(
  staffMemberId: string
): Promise<StaffAvailability[]> {
  const { data, error } = await supabase
    .from('staff_availability')
    .select('*')
    .eq('staff_member_id', staffMemberId)
    .order('day_of_week');

  if (error) throw error;
  return data || [];
}

/**
 * Set availability for a staff member (upsert)
 */
export async function setStaffAvailability(
  staffMemberId: string,
  availability: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
  }>
): Promise<StaffAvailability[]> {
  // Delete existing and insert new
  await supabase
    .from('staff_availability')
    .delete()
    .eq('staff_member_id', staffMemberId);

  if (availability.length === 0) return [];

  const { data, error } = await supabase
    .from('staff_availability')
    .insert(
      availability.map((a) => ({
        staff_member_id: staffMemberId,
        ...a,
      }))
    )
    .select();

  if (error) throw error;
  return data || [];
}

/**
 * Update single day availability for staff
 */
export async function updateStaffDayAvailability(
  staffMemberId: string,
  dayOfWeek: number,
  data: {
    start_time: string;
    end_time: string;
    is_available: boolean;
  }
): Promise<StaffAvailability> {
  const { data: availability, error } = await supabase
    .from('staff_availability')
    .upsert(
      {
        staff_member_id: staffMemberId,
        day_of_week: dayOfWeek,
        ...data,
      },
      { onConflict: 'staff_member_id,day_of_week' }
    )
    .select()
    .single();

  if (error) throw error;
  return availability;
}

// ============================================
// STAFF BLOCKED DATES FUNCTIONS
// ============================================

/**
 * Get blocked dates for a staff member
 */
export async function getStaffBlockedDates(
  staffMemberId: string,
  startDate?: string,
  endDate?: string
): Promise<StaffBlockedDate[]> {
  let query = supabase
    .from('staff_blocked_dates')
    .select('*')
    .eq('staff_member_id', staffMemberId);

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query.order('date');

  if (error) throw error;
  return data || [];
}

/**
 * Add blocked date for staff member
 */
export async function addStaffBlockedDate(
  staffMemberId: string,
  date: string,
  reason?: string,
  startTime?: string,
  endTime?: string
): Promise<StaffBlockedDate> {
  const { data, error } = await supabase
    .from('staff_blocked_dates')
    .insert({
      staff_member_id: staffMemberId,
      date,
      reason: reason || null,
      start_time: startTime || null,
      end_time: endTime || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove blocked date for staff member
 */
export async function removeStaffBlockedDate(
  staffMemberId: string,
  date: string
): Promise<void> {
  const { error } = await supabase
    .from('staff_blocked_dates')
    .delete()
    .eq('staff_member_id', staffMemberId)
    .eq('date', date);

  if (error) throw error;
}

/**
 * Update a staff member's blocked entry (time range and/or reason)
 */
export async function updateStaffBlockedDate(
  id: string,
  fields: { date?: string; reason?: string | null; start_time?: string | null; end_time?: string | null }
): Promise<StaffBlockedDate> {
  const { data, error } = await supabase
    .from('staff_blocked_dates')
    .update(fields)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove a single staff blocked entry by id
 */
export async function deleteStaffBlockedDate(id: string): Promise<void> {
  const { error } = await supabase
    .from('staff_blocked_dates')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// STAFF AVAILABILITY CHECK FUNCTIONS
// ============================================

/**
 * Check if a staff member is available at a specific time
 * Uses the database function for accurate checking
 */
export async function checkStaffAvailability(
  staffMemberId: string,
  date: string,
  time: string,
  durationMinutes: number
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_staff_available', {
    p_staff_member_id: staffMemberId,
    p_date: date,
    p_time: time,
    p_duration_minutes: durationMinutes,
  });

  if (error) throw error;
  return data;
}

/**
 * Get available staff members for a service at a specific time
 */
export async function getAvailableStaff(
  businessId: string,
  serviceCategory: Category,
  date: string,
  time: string,
  durationMinutes: number
): Promise<Array<{ staff_member_id: string; staff_name: string; staff_avatar: string | null }>> {
  const { data, error } = await supabase.rpc('get_available_staff', {
    p_business_id: businessId,
    p_service_category: serviceCategory,
    p_date: date,
    p_time: time,
    p_duration_minutes: durationMinutes,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Get all available time slots for a business on a specific date
 * Considers all staff members who can perform the service
 */
export async function getBusinessAvailableSlots(
  businessId: string,
  serviceCategory: Category,
  durationMinutes: number,
  date: string
): Promise<string[]> {
  // Get all active staff with this specialty
  const { data: staffMembers, error: staffError } = await supabase
    .from('staff_members')
    .select('id, specialties')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .contains('specialties', [serviceCategory]);

  if (staffError) throw staffError;
  if (!staffMembers || staffMembers.length === 0) return [];

  // Get availability for each staff member
  const dayOfWeek = new Date(date).getDay();
  const availableSlots = new Set<string>();

  for (const staff of staffMembers) {
    // Get staff availability for this day
    const { data: availability, error: availError } = await supabase
      .from('staff_availability')
      .select('*')
      .eq('staff_member_id', staff.id)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true)
      .single();

    if (availError && availError.code !== 'PGRST116') throw availError;
    if (!availability) continue;

    // Skip this staff entirely only when the whole day is blocked; partial
    // (time-range) blocks are handled per-slot by is_staff_available below.
    const { data: blockedRows } = await supabase
      .from('staff_blocked_dates')
      .select('start_time, end_time')
      .eq('staff_member_id', staff.id)
      .eq('date', date);

    const wholeDayBlocked = (blockedRows || []).some(
      (b) => !b.start_time || !b.end_time
    );
    if (wholeDayBlocked) continue;

    // Generate time slots and check availability
    const startHour = parseInt(availability.start_time.split(':')[0]);
    const endHour = parseInt(availability.end_time.split(':')[0]);
    const endMinute = parseInt(availability.end_time.split(':')[1] || '0');

    for (let hour = startHour; hour < endHour || (hour === endHour && 0 < endMinute); hour++) {
      for (const minute of [0, 30]) {
        const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        // Check if slot end time exceeds staff end time
        const slotEndMinutes = hour * 60 + minute + durationMinutes;
        const availEndMinutes = endHour * 60 + endMinute;
        if (slotEndMinutes > availEndMinutes) continue;

        // Check if staff is available at this slot
        const isAvailable = await checkStaffAvailability(
          staff.id,
          date,
          slotTime,
          durationMinutes
        );

        if (isAvailable) {
          availableSlots.add(slotTime);
        }
      }
    }
  }

  // Sort and return slots
  return Array.from(availableSlots).sort();
}

/**
 * Get staff members who can perform a specific service
 */
export async function getStaffForService(
  businessId: string,
  serviceCategory: Category
): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from('staff_members')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .contains('specialties', [serviceCategory])
    .order('name');

  if (error) throw error;
  return data || [];
}

// ============================================
// BOOKING STAFF ASSIGNMENT FUNCTIONS
// ============================================

/**
 * Reassign a booking to a different staff member
 */
export async function reassignBookingStaff(
  bookingId: string,
  staffMemberId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ staff_member_id: staffMemberId })
    .eq('id', bookingId);

  if (error) throw error;
}

/**
 * Get bookings assigned to a specific staff member
 */
export async function getStaffBookings(
  staffMemberId: string,
  status?: string[]
): Promise<any[]> {
  let query = supabase
    .from('bookings')
    .select(`
      *,
      service:services(*),
      client:users!bookings_client_id_fkey(*),
      professional:professional_profiles(*, user:users(*))
    `)
    .eq('staff_member_id', staffMemberId)
    .order('date', { ascending: true })
    .order('time_slot', { ascending: true });

  if (status && status.length > 0) {
    query = query.in('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get upcoming bookings for a staff member
 */
export async function getStaffUpcomingBookings(staffMemberId: string): Promise<any[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      service:services(*),
      client:users!bookings_client_id_fkey(*),
      professional:professional_profiles(*, user:users(*))
    `)
    .eq('staff_member_id', staffMemberId)
    .in('status', ['pending', 'confirmed'])
    .gte('date', today)
    .order('date', { ascending: true })
    .order('time_slot', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get staff member by user ID (for staff who have app accounts)
 */
export async function getStaffMemberByUserId(userId: string): Promise<StaffMember | null> {
  const { data, error } = await supabase
    .from('staff_members')
    .select(`
      *,
      business:businesses(*)
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}
