import { supabase } from './supabase';
import { SchedulingRules } from '../types';
import { ServiceResponse } from './professional';

// ============================================
// DEFAULTS
// ============================================

const DEFAULT_RULES: Omit<SchedulingRules, 'id' | 'professional_id' | 'created_at' | 'updated_at'> = {
  buffer_minutes: 15,
  max_daily_bookings: null,
  lunch_break_enabled: false,
  lunch_start_time: '12:00',
  lunch_end_time: '13:00',
  travel_buffer_minutes: 0,
  min_advance_booking_hours: 2,
};

// ============================================
// FUNCTIONS
// ============================================

export async function getSchedulingRules(
  professionalId: string
): Promise<ServiceResponse<SchedulingRules>> {
  try {
    const { data, error } = await supabase
      .from('scheduling_rules')
      .select('*')
      .eq('professional_id', professionalId)
      .single();

    if (error) {
      // No row found — return defaults
      if (error.code === 'PGRST116') {
        return {
          data: {
            id: '',
            professional_id: professionalId,
            created_at: '',
            updated_at: '',
            ...DEFAULT_RULES,
          },
          error: null,
        };
      }
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: data as SchedulingRules, error: null };
  } catch (err) {
    console.error('Error fetching scheduling rules:', err);
    return { data: null, error: { message: 'Failed to fetch scheduling rules' } };
  }
}

export async function upsertSchedulingRules(
  professionalId: string,
  rules: Partial<Omit<SchedulingRules, 'id' | 'professional_id' | 'created_at' | 'updated_at'>>
): Promise<ServiceResponse<SchedulingRules>> {
  try {
    const { data, error } = await supabase
      .from('scheduling_rules')
      .upsert(
        {
          professional_id: professionalId,
          ...rules,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'professional_id' }
      )
      .select('*')
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: data as SchedulingRules, error: null };
  } catch (err) {
    console.error('Error saving scheduling rules:', err);
    return { data: null, error: { message: 'Failed to save scheduling rules' } };
  }
}
