import { supabase } from './supabase';
import { ServicePackage } from '../types';

export interface ServiceError {
  message: string;
  code?: string;
}

export interface ServiceResponse<T = void> {
  data: T | null;
  error: ServiceError | null;
}

const PACKAGE_SELECT = `
  *,
  package_services:package_services(
    *,
    service:services(*)
  )
`;

// ============================================
// PROFESSIONAL PACKAGE MANAGEMENT
// ============================================

export async function getPackages(
  professionalId: string
): Promise<ServiceResponse<ServicePackage[]>> {
  try {
    const { data, error } = await supabase
      .from('service_packages')
      .select(PACKAGE_SELECT)
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    // Sort package_services by sort_order
    const packages = (data || []).map((pkg: any) => ({
      ...pkg,
      package_services: (pkg.package_services || []).sort(
        (a: any, b: any) => a.sort_order - b.sort_order
      ),
    }));

    return { data: packages as ServicePackage[], error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch packages' } };
  }
}

export async function getPackageById(
  packageId: string
): Promise<ServiceResponse<ServicePackage>> {
  try {
    const { data, error } = await supabase
      .from('service_packages')
      .select(PACKAGE_SELECT)
      .eq('id', packageId)
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    // Sort package_services by sort_order
    if (data?.package_services) {
      data.package_services.sort((a: any, b: any) => a.sort_order - b.sort_order);
    }

    return { data: data as ServicePackage, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch package' } };
  }
}

export async function createPackage(
  professionalId: string,
  packageData: {
    name: string;
    description?: string;
    total_price: number;
    discount_pct: number;
    service_ids: string[];
  }
): Promise<ServiceResponse<ServicePackage>> {
  try {
    // Create the package
    const { data: pkg, error: pkgError } = await supabase
      .from('service_packages')
      .insert({
        professional_id: professionalId,
        name: packageData.name,
        description: packageData.description || null,
        total_price: packageData.total_price,
        discount_pct: packageData.discount_pct,
      })
      .select()
      .single();

    if (pkgError) {
      return { data: null, error: { message: pkgError.message, code: pkgError.code } };
    }

    // Create package_services entries
    const packageServices = packageData.service_ids.map((serviceId, index) => ({
      package_id: pkg.id,
      service_id: serviceId,
      sort_order: index,
    }));

    const { error: psError } = await supabase
      .from('package_services')
      .insert(packageServices);

    if (psError) {
      // Rollback: delete the package if services insertion fails
      await supabase.from('service_packages').delete().eq('id', pkg.id);
      return { data: null, error: { message: psError.message, code: psError.code } };
    }

    // Fetch the complete package with services
    return getPackageById(pkg.id);
  } catch (err) {
    return { data: null, error: { message: 'Failed to create package' } };
  }
}

export async function updatePackage(
  packageId: string,
  updates: {
    name?: string;
    description?: string;
    total_price?: number;
    discount_pct?: number;
    is_active?: boolean;
    service_ids?: string[];
  }
): Promise<ServiceResponse<ServicePackage>> {
  try {
    // Update package fields
    const { service_ids, ...packageUpdates } = updates;

    if (Object.keys(packageUpdates).length > 0) {
      const { error } = await supabase
        .from('service_packages')
        .update({ ...packageUpdates, updated_at: new Date().toISOString() })
        .eq('id', packageId);

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } };
      }
    }

    // Replace package_services if service_ids provided
    if (service_ids) {
      // Delete existing
      const { error: delError } = await supabase
        .from('package_services')
        .delete()
        .eq('package_id', packageId);

      if (delError) {
        return { data: null, error: { message: delError.message, code: delError.code } };
      }

      // Insert new
      const packageServices = service_ids.map((serviceId, index) => ({
        package_id: packageId,
        service_id: serviceId,
        sort_order: index,
      }));

      const { error: insError } = await supabase
        .from('package_services')
        .insert(packageServices);

      if (insError) {
        return { data: null, error: { message: insError.message, code: insError.code } };
      }
    }

    return getPackageById(packageId);
  } catch (err) {
    return { data: null, error: { message: 'Failed to update package' } };
  }
}

export async function deletePackage(
  packageId: string
): Promise<ServiceResponse> {
  try {
    const { error } = await supabase
      .from('service_packages')
      .delete()
      .eq('id', packageId);

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to delete package' } };
  }
}

// ============================================
// CLIENT-FACING (PUBLIC)
// ============================================

export async function getActivePackages(
  professionalId: string
): Promise<ServiceResponse<ServicePackage[]>> {
  try {
    const { data, error } = await supabase
      .from('service_packages')
      .select(PACKAGE_SELECT)
      .eq('professional_id', professionalId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    const packages = (data || []).map((pkg: any) => ({
      ...pkg,
      package_services: (pkg.package_services || []).sort(
        (a: any, b: any) => a.sort_order - b.sort_order
      ),
    }));

    return { data: packages as ServicePackage[], error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch packages' } };
  }
}
