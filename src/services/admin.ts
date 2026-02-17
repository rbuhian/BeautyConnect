import { supabase } from './supabase';
import {
  AdCreative,
  AdCreativeWithStats,
  AdStatus,
  AdType,
  AdTargetRole,
  AffiliateProduct,
  AdminDashboardStats,
  Category,
  FeaturedListingWithProfessional,
} from '../types';

// ============================================
// SERVICE TYPES
// ============================================

interface ServiceError {
  message: string;
  code?: string;
}

interface ServiceResponse<T = void> {
  data: T | null;
  error: ServiceError | null;
}

// ============================================
// AD CREATIVES — ADMIN CRUD
// ============================================

export async function getAllAdCreatives(): Promise<ServiceResponse<AdCreativeWithStats[]>> {
  try {
    const { data: ads, error } = await supabase
      .from('ad_creatives')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    // Fetch impression & click counts for each ad
    const adIds = (ads || []).map((a) => a.id);

    let impressionsResult: { data: any } = { data: null };
    let clicksResult: { data: any } = { data: null };
    try {
      const [ir, cr] = await Promise.all([
        supabase.rpc('count_impressions_by_ads', { ad_ids: adIds }),
        supabase.rpc('count_clicks_by_ads', { ad_ids: adIds }),
      ]);
      impressionsResult = ir;
      clicksResult = cr;
    } catch {
      // RPC functions may not exist yet — fall through to manual count
    }

    // Build lookup maps (fallback to manual count if RPC not available)
    const impressionMap = new Map<string, number>();
    const clickMap = new Map<string, number>();

    if (impressionsResult.data) {
      (impressionsResult.data as any[]).forEach((r: any) => {
        impressionMap.set(r.ad_id, Number(r.count));
      });
    }
    if (clicksResult.data) {
      (clicksResult.data as any[]).forEach((r: any) => {
        clickMap.set(r.ad_id, Number(r.count));
      });
    }

    // If RPC not available, do individual counts
    if (!impressionsResult.data && adIds.length > 0) {
      for (const id of adIds) {
        const { count } = await supabase
          .from('ad_impressions')
          .select('*', { count: 'exact', head: true })
          .eq('ad_id', id);
        impressionMap.set(id, count || 0);
      }
    }
    if (!clicksResult.data && adIds.length > 0) {
      for (const id of adIds) {
        const { count } = await supabase
          .from('ad_clicks')
          .select('*', { count: 'exact', head: true })
          .eq('ad_id', id);
        clickMap.set(id, count || 0);
      }
    }

    const adsWithStats: AdCreativeWithStats[] = (ads || []).map((ad) => {
      const impressions = impressionMap.get(ad.id) || 0;
      const clicks = clickMap.get(ad.id) || 0;
      return {
        ...ad,
        impressions,
        clicks,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      } as AdCreativeWithStats;
    });

    return { data: adsWithStats, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch ad creatives' } };
  }
}

export async function createAdCreative(ad: {
  type: AdType;
  advertiser_name: string;
  headline: string;
  subtext: string;
  image_url?: string | null;
  cta_label: string;
  cta_url: string;
  target_categories: Category[];
  target_user_role: AdTargetRole;
  status: AdStatus;
  start_date: string;
  end_date: string;
}): Promise<ServiceResponse<AdCreative>> {
  try {
    const { data, error } = await supabase
      .from('ad_creatives')
      .insert({
        ...ad,
        image_url: ad.image_url || null,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }
    return { data: data as AdCreative, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to create ad' } };
  }
}

export async function updateAdCreative(
  adId: string,
  updates: Partial<Omit<AdCreative, 'id' | 'created_at'>>
): Promise<ServiceResponse<AdCreative>> {
  try {
    const { data, error } = await supabase
      .from('ad_creatives')
      .update(updates)
      .eq('id', adId)
      .select()
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }
    return { data: data as AdCreative, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to update ad' } };
  }
}

export async function deleteAdCreative(adId: string): Promise<ServiceResponse> {
  try {
    const { error } = await supabase.from('ad_creatives').delete().eq('id', adId);
    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to delete ad' } };
  }
}

export async function updateAdStatus(
  adId: string,
  status: AdStatus
): Promise<ServiceResponse<AdCreative>> {
  return updateAdCreative(adId, { status });
}

// ============================================
// AFFILIATE PRODUCTS — ADMIN CRUD
// ============================================

export async function getAllAffiliateProducts(): Promise<ServiceResponse<AffiliateProduct[]>> {
  try {
    const { data, error } = await supabase
      .from('affiliate_products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }
    return { data: (data || []) as AffiliateProduct[], error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch affiliate products' } };
  }
}

export async function createAffiliateProduct(product: {
  name: string;
  brand: string;
  image_url: string;
  price: number;
  affiliate_url: string;
  target_categories: Category[];
  commission_rate: number;
  is_active: boolean;
}): Promise<ServiceResponse<AffiliateProduct>> {
  try {
    const { data, error } = await supabase
      .from('affiliate_products')
      .insert(product)
      .select()
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }
    return { data: data as AffiliateProduct, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to create affiliate product' } };
  }
}

export async function updateAffiliateProduct(
  productId: string,
  updates: Partial<Omit<AffiliateProduct, 'id' | 'created_at'>>
): Promise<ServiceResponse<AffiliateProduct>> {
  try {
    const { data, error } = await supabase
      .from('affiliate_products')
      .update(updates)
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }
    return { data: data as AffiliateProduct, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to update affiliate product' } };
  }
}

export async function deleteAffiliateProduct(productId: string): Promise<ServiceResponse> {
  try {
    const { error } = await supabase.from('affiliate_products').delete().eq('id', productId);
    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to delete affiliate product' } };
  }
}

// ============================================
// FEATURED LISTINGS — ADMIN VIEW
// ============================================

export async function getAllFeaturedListings(): Promise<
  ServiceResponse<FeaturedListingWithProfessional[]>
> {
  try {
    const { data, error } = await supabase
      .from('featured_listings')
      .select(
        `
        *,
        professional:professional_profiles!featured_listings_professional_id_fkey(
          id,
          categories,
          user:users!professional_profiles_user_id_fkey(name, avatar)
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    const listings: FeaturedListingWithProfessional[] = (data || []).map((row: any) => ({
      id: row.id,
      professional_id: row.professional_id,
      package: row.package,
      price_paid: row.price_paid,
      is_active: row.is_active,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      payment_ref: row.payment_ref,
      created_at: row.created_at,
      professional_name: row.professional?.user?.name || null,
      professional_avatar: row.professional?.user?.avatar || null,
      professional_categories: row.professional?.categories || [],
    }));

    return { data: listings, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch featured listings' } };
  }
}

export async function toggleFeaturedListing(
  listingId: string,
  isActive: boolean
): Promise<ServiceResponse> {
  try {
    const { error } = await supabase
      .from('featured_listings')
      .update({ is_active: isActive })
      .eq('id', listingId);

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to update featured listing' } };
  }
}

// ============================================
// ADMIN PAYMENTS
// ============================================

export interface AdminPaymentStats {
  totalDepositsCollected: number;
  totalBookingValue: number;
  featuredRevenue: number;
  totalPayable: number;
}

export interface ProfessionalPayable {
  professionalId: string;
  name: string;
  avatar: string | null;
  completedCount: number;
  totalEarned: number;
  depositsCollected: number;
}

export interface DepositTransaction {
  id: string;
  clientName: string;
  professionalName: string;
  serviceName: string;
  depositAmount: number;
  totalPrice: number;
  date: string;
  status: string;
}

export async function getAdminPaymentStats(
  period?: 'this_month' | 'last_month'
): Promise<ServiceResponse<AdminPaymentStats>> {
  try {
    let dateFilter: { gte?: string; lt?: string } | null = null;
    if (period) {
      const now = new Date();
      if (period === 'this_month') {
        dateFilter = {
          gte: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        };
      } else if (period === 'last_month') {
        dateFilter = {
          gte: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0],
          lt: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        };
      }
    }

    let bookingsQuery = supabase
      .from('bookings')
      .select('total_price, deposit_paid, deposit_amount, status');

    if (dateFilter?.gte) bookingsQuery = bookingsQuery.gte('date', dateFilter.gte);
    if (dateFilter?.lt) bookingsQuery = bookingsQuery.lt('date', dateFilter.lt);

    const [bookingsRes, featuredRes] = await Promise.all([
      bookingsQuery,
      supabase.from('featured_listings').select('price_paid'),
    ]);

    const bookings = bookingsRes.data || [];
    const featured = featuredRes.data || [];

    const paidDeposits = bookings.filter((b: any) => b.deposit_paid);
    const totalDepositsCollected = paidDeposits.reduce(
      (sum: number, b: any) => sum + (b.deposit_amount || 0),
      0
    );

    const completed = bookings.filter((b: any) => b.status === 'completed');
    const totalBookingValue = completed.reduce(
      (sum: number, b: any) => sum + (b.total_price || 0),
      0
    );

    const featuredRevenue = featured.reduce(
      (sum: number, f: any) => sum + (f.price_paid || 0),
      0
    );

    return {
      data: {
        totalDepositsCollected,
        totalBookingValue,
        featuredRevenue,
        totalPayable: totalBookingValue,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch payment stats' } };
  }
}

export async function getProfessionalPayables(): Promise<ServiceResponse<ProfessionalPayable[]>> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(
        'professional_id, total_price, deposit_paid, deposit_amount, status, professional:professional_profiles!bookings_professional_id_fkey(user:users!professional_profiles_user_id_fkey(name, avatar))'
      );

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    // Group by professional
    const map = new Map<
      string,
      { name: string; avatar: string | null; completedCount: number; totalEarned: number; depositsCollected: number }
    >();

    (data || []).forEach((b: any) => {
      const pid = b.professional_id;
      if (!map.has(pid)) {
        map.set(pid, {
          name: b.professional?.user?.name || 'Professional',
          avatar: b.professional?.user?.avatar || null,
          completedCount: 0,
          totalEarned: 0,
          depositsCollected: 0,
        });
      }
      const entry = map.get(pid)!;
      if (b.status === 'completed') {
        entry.completedCount++;
        entry.totalEarned += b.total_price || 0;
      }
      if (b.deposit_paid) {
        entry.depositsCollected += b.deposit_amount || 0;
      }
    });

    const payables: ProfessionalPayable[] = [];
    map.forEach((val, key) => {
      if (val.completedCount > 0 || val.depositsCollected > 0) {
        payables.push({ professionalId: key, ...val });
      }
    });

    payables.sort((a, b) => b.totalEarned - a.totalEarned);

    return { data: payables, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch professional payables' } };
  }
}

export async function getRecentDepositTransactions(
  limit = 20
): Promise<ServiceResponse<DepositTransaction[]>> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(
        'id, date, total_price, deposit_amount, deposit_paid, status, service:services(name), client:users!bookings_client_id_fkey(name), professional:professional_profiles!bookings_professional_id_fkey(user:users!professional_profiles_user_id_fkey(name))'
      )
      .eq('deposit_paid', true)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    const transactions: DepositTransaction[] = (data || []).map((b: any) => ({
      id: b.id,
      clientName: b.client?.name || 'Client',
      professionalName: b.professional?.user?.name || 'Professional',
      serviceName: b.service?.name || 'Service',
      depositAmount: b.deposit_amount || 0,
      totalPrice: b.total_price || 0,
      date: b.date,
      status: b.status,
    }));

    return { data: transactions, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch deposit transactions' } };
  }
}

// ============================================
// ADMIN DASHBOARD STATS
// ============================================

export async function getAdminDashboardStats(): Promise<ServiceResponse<AdminDashboardStats>> {
  try {
    const now = new Date().toISOString();

    const [
      adsResult,
      impressionsResult,
      clicksResult,
      featuredResult,
      affiliateResult,
    ] = await Promise.all([
      supabase.from('ad_creatives').select('status', { count: 'exact' }),
      supabase.from('ad_impressions').select('*', { count: 'exact', head: true }),
      supabase.from('ad_clicks').select('*', { count: 'exact', head: true }),
      supabase.from('featured_listings').select('price_paid, is_active, ends_at'),
      supabase.from('affiliate_products').select('is_active', { count: 'exact' }),
    ]);

    const ads = adsResult.data || [];
    const totalAds = ads.length;
    const activeAds = ads.filter((a: any) => a.status === 'active').length;
    const pausedAds = ads.filter((a: any) => a.status === 'paused').length;

    const totalImpressions = impressionsResult.count || 0;
    const totalClicks = clicksResult.count || 0;
    const overallCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    const featured = featuredResult.data || [];
    const totalFeaturedRevenue = featured.reduce((sum: number, f: any) => sum + (f.price_paid || 0), 0);
    const activeFeaturedListings = featured.filter(
      (f: any) => f.is_active && f.ends_at >= now
    ).length;

    const affiliates = affiliateResult.data || [];
    const totalAffiliateProducts = affiliates.length;
    const activeAffiliateProducts = affiliates.filter((a: any) => a.is_active).length;

    return {
      data: {
        total_ads: totalAds,
        active_ads: activeAds,
        paused_ads: pausedAds,
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        overall_ctr: Math.round(overallCtr * 100) / 100,
        total_featured_revenue: totalFeaturedRevenue,
        active_featured_listings: activeFeaturedListings,
        total_affiliate_products: totalAffiliateProducts,
        active_affiliate_products: activeAffiliateProducts,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch dashboard stats' } };
  }
}
