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
  LocationType,
  ProfessionalListItem,
  ClientListItem,
  AdminProfessionalDetail,
  AdminClientDetail,
  Service,
  Booking,
  ProfessionalVerification,
} from '../types';
import { getVerificationSignedUrl } from './storage';

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
      professionalsResult,
      clientsResult,
    ] = await Promise.all([
      supabase.from('ad_creatives').select('status', { count: 'exact' }),
      supabase.from('ad_impressions').select('*', { count: 'exact', head: true }),
      supabase.from('ad_clicks').select('*', { count: 'exact', head: true }),
      supabase.from('featured_listings').select('price_paid, is_active, ends_at'),
      supabase.from('affiliate_products').select('is_active', { count: 'exact' }),
      supabase.from('professional_profiles').select('is_live'),
      supabase.from('users').select('role', { count: 'exact' }).eq('role', 'client'),
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

    const professionals = professionalsResult.data || [];
    const totalProfessionals = professionals.length;
    const activeProfessionals = professionals.filter((p: any) => p.is_live).length;
    const totalClients = clientsResult.count || 0;

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
        total_professionals: totalProfessionals,
        active_professionals: activeProfessionals,
        total_clients: totalClients,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch dashboard stats' } };
  }
}

// ============================================
// ADMIN USER MANAGEMENT — PROFESSIONALS
// ============================================

export interface AdminProfessionalFilters {
  location_type?: LocationType | 'all';
  is_live?: boolean;
  search?: string;
}

export async function getAllProfessionals(
  filters?: AdminProfessionalFilters
): Promise<ServiceResponse<ProfessionalListItem[]>> {
  try {
    const { data, error } = await supabase
      .from('professional_profiles')
      .select(`
        id,
        user_id,
        categories,
        location_type,
        is_live,
        avg_rating,
        total_reviews,
        created_at,
        user:users!professional_profiles_user_id_fkey(
          id, name, avatar, email, is_suspended
        ),
        business:businesses(
          id, business_name, business_type
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    let items: ProfessionalListItem[] = (data || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      name: row.user?.name || null,
      avatar: row.user?.avatar || null,
      email: row.user?.email || '',
      categories: row.categories || [],
      location_type: row.location_type,
      is_live: row.is_live,
      avg_rating: row.avg_rating || 0,
      total_reviews: row.total_reviews || 0,
      created_at: row.created_at,
      business_name: row.business?.business_name || null,
      business_type: row.business?.business_type || null,
    }));

    if (filters?.location_type && filters.location_type !== 'all') {
      items = items.filter((p) => p.location_type === filters!.location_type);
    }
    if (filters?.is_live !== undefined) {
      items = items.filter((p) => p.is_live === filters!.is_live);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.email.includes(q) ||
          p.business_name?.toLowerCase().includes(q)
      );
    }

    return { data: items, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch professionals' } };
  }
}

export async function getProfessionalAdminDetail(
  professionalId: string
): Promise<ServiceResponse<AdminProfessionalDetail>> {
  try {
    const [profileRes, servicesRes, bookingsRes] = await Promise.all([
      supabase
        .from('professional_profiles')
        .select(`
          id, user_id, bio, categories, location_type, service_area,
          salon_address, is_live, avg_rating, total_reviews, created_at,
          user:users!professional_profiles_user_id_fkey(
            id, name, avatar, email, is_suspended
          ),
          business:businesses(*)
        `)
        .eq('id', professionalId)
        .single(),

      supabase
        .from('services')
        .select('*')
        .eq('professional_id', professionalId)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),

      supabase
        .from('bookings')
        .select(`
          id, date, time_slot, status, total_price, deposit_amount,
          deposit_paid, created_at,
          service:services(name, category),
          client:users!bookings_client_id_fkey(id, name, avatar)
        `)
        .eq('professional_id', professionalId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (profileRes.error) {
      return { data: null, error: { message: profileRes.error.message, code: profileRes.error.code } };
    }

    const profile = profileRes.data as any;
    const allBookings = bookingsRes.data || [];
    const completed = allBookings.filter((b: any) => b.status === 'completed');

    const detail: AdminProfessionalDetail = {
      id: profile.id,
      user_id: profile.user_id,
      name: profile.user?.name || null,
      avatar: profile.user?.avatar || null,
      email: profile.user?.email || '',
      bio: profile.bio || '',
      categories: profile.categories || [],
      location_type: profile.location_type,
      service_area: profile.service_area || '',
      salon_address: profile.salon_address || null,
      is_live: profile.is_live,
      avg_rating: profile.avg_rating || 0,
      total_reviews: profile.total_reviews || 0,
      created_at: profile.created_at,
      business: profile.business || null,
      total_bookings: allBookings.length,
      completed_bookings: completed.length,
      total_revenue: completed.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0),
      services: (servicesRes.data || []) as Service[],
      recent_bookings: allBookings as Booking[],
    };

    return { data: detail, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch professional detail' } };
  }
}

export async function toggleProfessionalLive(
  professionalId: string,
  isLive: boolean
): Promise<ServiceResponse> {
  try {
    const { error } = await supabase
      .from('professional_profiles')
      .update({ is_live: isLive, updated_at: new Date().toISOString() })
      .eq('id', professionalId);

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to update professional status' } };
  }
}

// ============================================
// ADMIN USER MANAGEMENT — CLIENTS
// ============================================

export async function getAllClients(
  search?: string
): Promise<ServiceResponse<ClientListItem[]>> {
  try {
    const [usersRes, bookingsRes] = await Promise.all([
      supabase
        .from('users')
        .select('id, name, avatar, email, created_at, is_suspended')
        .eq('role', 'client')
        .order('created_at', { ascending: false }),

      supabase
        .from('bookings')
        .select('client_id, status, total_price'),
    ]);

    if (usersRes.error) {
      return { data: null, error: { message: usersRes.error.message, code: usersRes.error.code } };
    }

    // Build booking stats map: client_id → { count, spent }
    const statsMap = new Map<string, { count: number; spent: number }>();
    (bookingsRes.data || []).forEach((b: any) => {
      const entry = statsMap.get(b.client_id) || { count: 0, spent: 0 };
      entry.count++;
      if (b.status === 'completed') entry.spent += b.total_price || 0;
      statsMap.set(b.client_id, entry);
    });

    let items: ClientListItem[] = (usersRes.data || []).map((u: any) => {
      const stats = statsMap.get(u.id) || { count: 0, spent: 0 };
      return {
        id: u.id,
        name: u.name || null,
        avatar: u.avatar || null,
        email: u.email || '',
        created_at: u.created_at,
        is_suspended: u.is_suspended || false,
        booking_count: stats.count,
        total_spent: stats.spent,
      };
    });

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (c) => c.name?.toLowerCase().includes(q) || c.email.includes(q)
      );
    }

    return { data: items, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch clients' } };
  }
}

export async function getClientAdminDetail(
  userId: string
): Promise<ServiceResponse<AdminClientDetail>> {
  try {
    const [userRes, bookingsRes] = await Promise.all([
      supabase
        .from('users')
        .select('id, name, avatar, email, created_at, is_suspended')
        .eq('id', userId)
        .single(),

      supabase
        .from('bookings')
        .select(`
          id, date, time_slot, status, total_price, deposit_amount,
          deposit_paid, created_at, cancelled_at,
          service:services(name, category, price),
          professional:professional_profiles!bookings_professional_id_fkey(
            id,
            user:users!professional_profiles_user_id_fkey(name, avatar)
          )
        `)
        .eq('client_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (userRes.error) {
      return { data: null, error: { message: userRes.error.message, code: userRes.error.code } };
    }

    const user = userRes.data as any;
    const bookings = (bookingsRes.data || []) as any[];
    const completed = bookings.filter((b) => b.status === 'completed');
    const cancelled = bookings.filter((b) => b.status === 'cancelled');

    const detail: AdminClientDetail = {
      id: user.id,
      name: user.name || null,
      avatar: user.avatar || null,
      email: user.email || '',
      created_at: user.created_at,
      is_suspended: user.is_suspended || false,
      total_bookings: bookings.length,
      completed_bookings: completed.length,
      cancelled_bookings: cancelled.length,
      total_spent: completed.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0),
      bookings: bookings as Booking[],
    };

    return { data: detail, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch client detail' } };
  }
}

export async function toggleClientSuspension(
  userId: string,
  isSuspended: boolean
): Promise<ServiceResponse> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ is_suspended: isSuspended })
      .eq('id', userId);

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to update client status' } };
  }
}

// ============================================
// IDENTITY VERIFICATION
// ============================================

export interface VerificationListItem {
  id: string;
  professional_id: string;
  name: string | null;
  avatar: string | null;
  email: string;
  submitted_at: string;
  status: string;
}

export interface VerificationDetail extends ProfessionalVerification {
  professional_name: string | null;
  professional_avatar: string | null;
  professional_email: string;
  id_document_signed_url: string | null;
  certificate_signed_urls: string[];
}

export async function getPendingVerifications(): Promise<ServiceResponse<VerificationListItem[]>> {
  try {
    const { data, error } = await supabase
      .from('professional_verifications')
      .select(`
        id,
        professional_id,
        submitted_at,
        status,
        professional_profiles!inner (
          user_id,
          users!inner ( name, avatar, email )
        )
      `)
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true });

    if (error) return { data: null, error: { message: error.message } };

    const items: VerificationListItem[] = (data || []).map((row: any) => ({
      id: row.id,
      professional_id: row.professional_id,
      submitted_at: row.submitted_at,
      status: row.status,
      name: row.professional_profiles?.users?.name || null,
      avatar: row.professional_profiles?.users?.avatar || null,
      email: row.professional_profiles?.users?.email || '',
    }));

    return { data: items, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch pending verifications' } };
  }
}

export async function getVerificationDetail(
  verificationId: string
): Promise<ServiceResponse<VerificationDetail>> {
  try {
    const { data: row, error } = await supabase
      .from('professional_verifications')
      .select(`
        *,
        professional_profiles!inner (
          user_id,
          users!inner ( name, avatar, email )
        )
      `)
      .eq('id', verificationId)
      .single();

    if (error) return { data: null, error: { message: error.message } };

    // Generate signed URLs for private documents
    let idSignedUrl: string | null = null;
    if (row.id_document_path) {
      try { idSignedUrl = await getVerificationSignedUrl(row.id_document_path); } catch { /* ignore */ }
    }

    const certSignedUrls: string[] = [];
    for (const path of (row.certificate_paths || [])) {
      try {
        certSignedUrls.push(await getVerificationSignedUrl(path));
      } catch { /* ignore */ }
    }

    const detail: VerificationDetail = {
      id: row.id,
      professional_id: row.professional_id,
      status: row.status,
      id_document_path: row.id_document_path,
      certificate_paths: row.certificate_paths || [],
      submission_notes: row.submission_notes,
      admin_notes: row.admin_notes,
      submitted_at: row.submitted_at,
      reviewed_at: row.reviewed_at,
      reviewed_by: row.reviewed_by,
      created_at: row.created_at,
      professional_name: row.professional_profiles?.users?.name || null,
      professional_avatar: row.professional_profiles?.users?.avatar || null,
      professional_email: row.professional_profiles?.users?.email || '',
      id_document_signed_url: idSignedUrl,
      certificate_signed_urls: certSignedUrls,
    };

    return { data: detail, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch verification detail' } };
  }
}

export async function approveVerification(
  verificationId: string,
  professionalId: string
): Promise<ServiceResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { error: verError } = await supabase
      .from('professional_verifications')
      .update({
        status: 'verified',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id || null,
      })
      .eq('id', verificationId);

    if (verError) return { data: null, error: { message: verError.message } };

    const { error: proError } = await supabase
      .from('professional_profiles')
      .update({ is_verified: true, verification_status: 'verified' })
      .eq('id', professionalId);

    if (proError) return { data: null, error: { message: proError.message } };

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to approve verification' } };
  }
}

export async function rejectVerification(
  verificationId: string,
  professionalId: string,
  adminNotes: string
): Promise<ServiceResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { error: verError } = await supabase
      .from('professional_verifications')
      .update({
        status: 'rejected',
        admin_notes: adminNotes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id || null,
      })
      .eq('id', verificationId);

    if (verError) return { data: null, error: { message: verError.message } };

    const { error: proError } = await supabase
      .from('professional_profiles')
      .update({ is_verified: false, verification_status: 'rejected' })
      .eq('id', professionalId);

    if (proError) return { data: null, error: { message: proError.message } };

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to reject verification' } };
  }
}

// ============================================
// REPORTS
// ============================================

export interface ReportListItem {
  id: string;
  reporter_id: string;
  reporter_name: string | null;
  reported_user_id: string;
  reported_name: string | null;
  reason: string;
  status: string;
  created_at: string;
}

export interface ReportDetail {
  id: string;
  reporter_id: string;
  reporter_name: string | null;
  reporter_email: string | null;
  reporter_avatar: string | null;
  reported_user_id: string;
  reported_name: string | null;
  reported_email: string | null;
  reported_avatar: string | null;
  reported_role: string;
  reason: string;
  details: string | null;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  total_reports_against: number;
}

export async function getPendingReports(): Promise<ServiceResponse<ReportListItem[]>> {
  try {
    const { data, error } = await supabase
      .from('user_reports')
      .select(`
        id,
        reporter_id,
        reported_user_id,
        reason,
        status,
        created_at,
        reporter:users!reporter_id ( name ),
        reported:users!reported_user_id ( name )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) return { data: null, error: { message: error.message } };

    const items: ReportListItem[] = (data || []).map((row: any) => ({
      id: row.id,
      reporter_id: row.reporter_id,
      reporter_name: row.reporter?.name || null,
      reported_user_id: row.reported_user_id,
      reported_name: row.reported?.name || null,
      reason: row.reason,
      status: row.status,
      created_at: row.created_at,
    }));

    return { data: items, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch pending reports' } };
  }
}

export async function getReportDetail(
  reportId: string
): Promise<ServiceResponse<ReportDetail>> {
  try {
    const { data: row, error } = await supabase
      .from('user_reports')
      .select(`
        *,
        reporter:users!reporter_id ( name, email, avatar ),
        reported:users!reported_user_id ( name, email, avatar, role )
      `)
      .eq('id', reportId)
      .single();

    if (error) return { data: null, error: { message: error.message } };

    // Count all reports against the reported user
    const { count } = await supabase
      .from('user_reports')
      .select('id', { count: 'exact', head: true })
      .eq('reported_user_id', row.reported_user_id);

    const detail: ReportDetail = {
      id: row.id,
      reporter_id: row.reporter_id,
      reporter_name: row.reporter?.name || null,
      reporter_email: row.reporter?.email || null,
      reporter_avatar: row.reporter?.avatar || null,
      reported_user_id: row.reported_user_id,
      reported_name: row.reported?.name || null,
      reported_email: row.reported?.email || null,
      reported_avatar: row.reported?.avatar || null,
      reported_role: row.reported?.role || 'client',
      reason: row.reason,
      details: row.details,
      status: row.status,
      admin_notes: row.admin_notes,
      reviewed_by: row.reviewed_by,
      reviewed_at: row.reviewed_at,
      created_at: row.created_at,
      total_reports_against: count || 0,
    };

    return { data: detail, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch report detail' } };
  }
}

export async function reviewReport(
  reportId: string,
  status: 'actioned' | 'dismissed',
  adminNotes?: string
): Promise<ServiceResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('user_reports')
      .update({
        status,
        admin_notes: adminNotes || null,
        reviewed_by: user?.id || null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (error) return { data: null, error: { message: error.message } };
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to review report' } };
  }
}
