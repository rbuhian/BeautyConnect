import { supabase } from './supabase';
import { UserReport, ReportReason } from '../types';

interface ServiceError {
  message: string;
  code?: string;
}

interface ServiceResponse<T = void> {
  data: T | null;
  error: ServiceError | null;
}

/**
 * Block a user. Inserts into user_blocks with current user as blocker.
 */
export async function blockUser(blockedId: string): Promise<ServiceResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'Not authenticated' } };

    const { error } = await supabase
      .from('user_blocks')
      .insert({ blocker_id: user.id, blocked_id: blockedId });

    if (error) return { data: null, error: { message: error.message } };
    return { data: null, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err.message } };
  }
}

/**
 * Unblock a previously blocked user.
 */
export async function unblockUser(blockedId: string): Promise<ServiceResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'Not authenticated' } };

    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedId);

    if (error) return { data: null, error: { message: error.message } };
    return { data: null, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err.message } };
  }
}

/**
 * Check whether the current user has blocked a specific user.
 */
export async function isUserBlocked(userId: string): Promise<ServiceResponse<boolean>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: false, error: null };

    const { data, error } = await supabase
      .from('user_blocks')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId)
      .maybeSingle();

    if (error) return { data: false, error: { message: error.message } };
    return { data: !!data, error: null };
  } catch (err: any) {
    return { data: false, error: { message: err.message } };
  }
}

/**
 * Get all user IDs that the current user has blocked.
 * Used to filter out blocked professionals from Discover.
 */
export async function getBlockedUserIds(): Promise<ServiceResponse<string[]>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: null };

    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', user.id);

    if (error) return { data: [], error: { message: error.message } };
    return { data: (data ?? []).map((row) => row.blocked_id), error: null };
  } catch (err: any) {
    return { data: [], error: { message: err.message } };
  }
}

/**
 * Submit a report against a user.
 */
export async function submitReport(
  reportedUserId: string,
  reason: ReportReason,
  details?: string
): Promise<ServiceResponse<UserReport>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'Not authenticated' } };

    const { data, error } = await supabase
      .from('user_reports')
      .insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        reason,
        details: details || null,
      })
      .select()
      .single();

    if (error) return { data: null, error: { message: error.message } };
    return { data: data as UserReport, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err.message } };
  }
}
