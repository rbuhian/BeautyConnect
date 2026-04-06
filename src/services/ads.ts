import { supabase } from './supabase';
import {
  AdCreative,
  AdType,
  AffiliateProduct,
  Category,
  FeaturedListing,
  FeaturedPackageKey,
  ProfessionalProfile,
  Service,
} from '../types';
import { FEATURES } from '../constants';

// ============================================
// SERVICE TYPES (matches client.ts pattern)
// ============================================

interface ServiceError {
  message: string;
  code?: string;
}

interface ServiceResponse<T = void> {
  data: T | null;
  error: ServiceError | null;
}

export interface FeaturedProfessional extends Omit<ProfessionalProfile, 'user'> {
  user: { id: string; name: string | null; avatar: string | null };
  services: Service[];
  min_price?: number;
  max_price?: number;
  is_featured: true;
}

// ============================================
// AD CREATIVES
// ============================================

export async function getActiveAds(
  type: AdType,
  targetRole: 'client' | 'professional',
  categories?: Category[]
): Promise<ServiceResponse<AdCreative[]>> {
  if (!FEATURES.ADS_ENABLED) return { data: [], error: null };
  try {
    let query = supabase
      .from('ad_creatives')
      .select('*')
      .eq('type', type)
      .eq('status', 'active')
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString())
      .or(`target_user_role.eq.${targetRole},target_user_role.eq.both`);

    // RLS already filters active + date range, but we add explicit checks
    // for defense-in-depth

    const { data, error } = await query;

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    let ads = (data || []) as AdCreative[];

    // Client-side category filtering (Supabase array overlap is tricky with RLS)
    if (categories && categories.length > 0) {
      ads = ads.filter(
        (ad) =>
          ad.target_categories.length === 0 ||
          ad.target_categories.some((c) => categories.includes(c))
      );
    }

    return { data: ads, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch ads' } };
  }
}

// ============================================
// FEATURED LISTINGS
// ============================================

export async function getFeaturedProfessionals(): Promise<
  ServiceResponse<FeaturedProfessional[]>
> {
  if (!FEATURES.ADS_ENABLED) return { data: [], error: null };
  try {
    const now = new Date().toISOString();

    // Step 1: Get active featured listing professional IDs
    const { data: listings, error: listingsError } = await supabase
      .from('featured_listings')
      .select('professional_id')
      .eq('is_active', true)
      .gte('ends_at', now);

    if (listingsError) {
      return { data: null, error: { message: listingsError.message } };
    }

    if (!listings || listings.length === 0) {
      return { data: [], error: null };
    }

    const featuredIds = listings.map((l) => l.professional_id);

    // Step 2: Fetch full professional profiles for featured IDs
    const { data, error } = await supabase
      .from('professional_profiles')
      .select(
        `
        *,
        user:users!professional_profiles_user_id_fkey(id, name, avatar),
        services:services(*)
      `
      )
      .eq('is_live', true)
      .in('id', featuredIds);

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    const professionals = (data || []).map((pro) => {
      const activeServices = (pro.services || []).filter(
        (s: Service) => s.is_active
      );
      const prices = activeServices.map((s: Service) => s.price);
      return {
        ...pro,
        min_price: prices.length > 0 ? Math.min(...prices) : 0,
        max_price: prices.length > 0 ? Math.max(...prices) : 0,
        is_featured: true as const,
      };
    }) as FeaturedProfessional[];

    return { data: professionals, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch featured professionals' } };
  }
}

export async function getFeaturedListingStatus(
  professionalId: string
): Promise<ServiceResponse<{ is_featured: boolean; ends_at: string | null; package: FeaturedPackageKey | null }>> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('featured_listings')
      .select('id, ends_at, package')
      .eq('professional_id', professionalId)
      .eq('is_active', true)
      .gte('ends_at', now)
      .order('ends_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return {
      data: {
        is_featured: !!data,
        ends_at: data?.ends_at || null,
        package: data?.package || null,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: 'Failed to check featured status' } };
  }
}

export async function createFeaturedListing(
  professionalId: string,
  pkg: FeaturedPackageKey,
  pricePaid: number,
  durationDays: number,
  paymentRef?: string
): Promise<ServiceResponse<FeaturedListing>> {
  try {
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('featured_listings')
      .insert({
        professional_id: professionalId,
        package: pkg,
        price_paid: pricePaid,
        is_active: true,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        payment_ref: paymentRef || null,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: data as FeaturedListing, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to create featured listing' } };
  }
}

// ============================================
// AFFILIATE PRODUCTS
// ============================================

export async function getAffiliateProducts(
  categories?: Category[]
): Promise<ServiceResponse<AffiliateProduct[]>> {
  if (!FEATURES.ADS_ENABLED) return { data: [], error: null };
  try {
    const { data, error } = await supabase
      .from('affiliate_products')
      .select('*')
      .eq('is_active', true);

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    // Client-side category filtering
    let products = (data || []) as AffiliateProduct[];
    if (categories && categories.length > 0) {
      products = products.filter(
        (p) =>
          p.target_categories.length === 0 ||
          p.target_categories.some((c) => categories.includes(c))
      );
    }

    return { data: products, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch affiliate products' } };
  }
}

// ============================================
// ANALYTICS (fire-and-forget)
// ============================================

export async function recordImpression(
  adId: string,
  userId: string,
  screen: string,
  position: number = 0
): Promise<void> {
  if (!FEATURES.ADS_ENABLED) return;
  try {
    await supabase.from('ad_impressions').insert({
      ad_id: adId,
      user_id: userId,
      screen,
      position,
    });
  } catch {
    // Analytics failures are non-blocking
  }
}

export async function recordClick(
  adId: string,
  userId: string,
  screen: string
): Promise<void> {
  if (!FEATURES.ADS_ENABLED) return;
  try {
    await supabase.from('ad_clicks').insert({
      ad_id: adId,
      user_id: userId,
      screen,
    });
  } catch {
    // Analytics failures are non-blocking
  }
}
