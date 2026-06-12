import { supabase } from './supabase';
import { Promotion, PromotionUse } from '../types';
import { ServiceResponse, ServiceError } from './professional';

// Validate a promotion code for a given professional and order value
export async function validatePromoCode(
  code: string,
  professionalId: string,
  orderValue: number
): Promise<ServiceResponse<{ promotion: Promotion; discountAmount: number }>> {
  try {
    const now = new Date().toISOString();

    // Look for promo matching: exact pro OR platform-wide (professional_id IS NULL)
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('is_active', true)
      .lte('starts_at', now)
      .gt('ends_at', now)
      .or(`professional_id.eq.${professionalId},professional_id.is.null`)
      .single();

    if (error || !data) {
      return { data: null, error: { message: 'Invalid or expired promo code' } };
    }

    const promotion = data as Promotion;

    // Check min order value
    if (orderValue < promotion.min_order_value) {
      return {
        data: null,
        error: {
          message: `Minimum order of ₱${promotion.min_order_value.toLocaleString()} required`,
        },
      };
    }

    // Check max uses
    if (promotion.max_uses !== null && promotion.uses_count >= promotion.max_uses) {
      return { data: null, error: { message: 'This promo code has reached its usage limit' } };
    }

    // Calculate discount
    let discountAmount = 0;
    if (promotion.discount_type === 'percentage') {
      discountAmount = (orderValue * promotion.discount_value) / 100;
    } else {
      discountAmount = Math.min(promotion.discount_value, orderValue);
    }

    return { data: { promotion, discountAmount }, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to validate promo code' } };
  }
}

// Record a promotion use after a booking is created
export async function recordPromotionUse(
  promotionId: string,
  bookingId: string,
  clientId: string,
  discountApplied: number
): Promise<ServiceResponse<PromotionUse>> {
  try {
    const { data, error } = await supabase
      .from('promotion_uses')
      .insert({
        promotion_id: promotionId,
        booking_id: bookingId,
        client_id: clientId,
        discount_applied: discountApplied,
      })
      .select()
      .single();

    if (error) return { data: null, error: { message: error.message } };

    // Increment uses_count
    await supabase.rpc('increment_promotion_uses', { promo_id: promotionId });

    return { data: data as PromotionUse, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to record promotion use' } };
  }
}

// Get all promotions for a professional
export async function getPromotions(professionalId: string): Promise<ServiceResponse<Promotion[]>> {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: { message: error.message } };
    return { data: (data || []) as Promotion[], error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch promotions' } };
  }
}

// Get a single promotion by ID
export async function getPromotionById(id: string): Promise<ServiceResponse<Promotion>> {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return { data: null, error: { message: error.message } };
    return { data: data as Promotion, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch promotion' } };
  }
}

export interface CreatePromotionInput {
  code: string;
  title: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_uses?: number | null;
  starts_at: string;
  ends_at: string;
}

// Create a new promotion
export async function createPromotion(
  professionalId: string,
  input: CreatePromotionInput
): Promise<ServiceResponse<Promotion>> {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .insert({
        professional_id: professionalId,
        code: input.code.trim().toUpperCase(),
        title: input.title.trim(),
        description: input.description?.trim() || null,
        discount_type: input.discount_type,
        discount_value: input.discount_value,
        min_order_value: input.min_order_value,
        max_uses: input.max_uses ?? null,
        starts_at: input.starts_at,
        ends_at: input.ends_at,
      })
      .select()
      .single();

    if (error) return { data: null, error: { message: error.message } };
    return { data: data as Promotion, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to create promotion' } };
  }
}

// Update an existing promotion
export async function updatePromotion(
  id: string,
  input: Partial<CreatePromotionInput>
): Promise<ServiceResponse<Promotion>> {
  try {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (input.code !== undefined) updateData.code = input.code.trim().toUpperCase();
    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.description !== undefined) updateData.description = input.description?.trim() || null;
    if (input.discount_type !== undefined) updateData.discount_type = input.discount_type;
    if (input.discount_value !== undefined) updateData.discount_value = input.discount_value;
    if (input.min_order_value !== undefined) updateData.min_order_value = input.min_order_value;
    if ('max_uses' in input) updateData.max_uses = input.max_uses ?? null;
    if (input.starts_at !== undefined) updateData.starts_at = input.starts_at;
    if (input.ends_at !== undefined) updateData.ends_at = input.ends_at;

    const { data, error } = await supabase
      .from('promotions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error: { message: error.message } };
    return { data: data as Promotion, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to update promotion' } };
  }
}

// Toggle active status
export async function togglePromotionActive(
  id: string,
  isActive: boolean
): Promise<ServiceResponse<Promotion>> {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error: { message: error.message } };
    return { data: data as Promotion, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to update promotion' } };
  }
}

// Delete a promotion
export async function deletePromotion(id: string): Promise<ServiceResponse<null>> {
  try {
    const { error } = await supabase.from('promotions').delete().eq('id', id);
    if (error) return { data: null, error: { message: error.message } };
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to delete promotion' } };
  }
}

// Get active promotions for a professional (for client view)
export async function getActivePromotions(
  professionalId: string
): Promise<ServiceResponse<Promotion[]>> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .or(`professional_id.eq.${professionalId},professional_id.is.null`)
      .eq('is_active', true)
      .lte('starts_at', now)
      .gt('ends_at', now)
      .order('discount_value', { ascending: false });

    if (error) return { data: null, error: { message: error.message } };
    return { data: (data || []) as Promotion[], error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch promotions' } };
  }
}

// Admin: get all platform promotions (professional_id IS NULL)
export async function getPlatformPromotions(): Promise<ServiceResponse<Promotion[]>> {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .is('professional_id', null)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: { message: error.message } };
    return { data: (data || []) as Promotion[], error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch platform promotions' } };
  }
}

// Admin: create platform-wide promotion (professional_id = NULL)
export async function createPlatformPromotion(
  input: CreatePromotionInput
): Promise<ServiceResponse<Promotion>> {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .insert({
        professional_id: null,
        code: input.code.trim().toUpperCase(),
        title: input.title.trim(),
        description: input.description?.trim() || null,
        discount_type: input.discount_type,
        discount_value: input.discount_value,
        min_order_value: input.min_order_value,
        max_uses: input.max_uses ?? null,
        starts_at: input.starts_at,
        ends_at: input.ends_at,
      })
      .select()
      .single();

    if (error) return { data: null, error: { message: error.message } };
    return { data: data as Promotion, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to create platform promotion' } };
  }
}
