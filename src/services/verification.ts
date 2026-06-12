import { supabase } from './supabase';
import { ProfessionalVerification } from '../types';
import { uploadVerificationDoc } from './storage';

interface ServiceError {
  message: string;
  code?: string;
}

interface ServiceResponse<T = void> {
  data: T | null;
  error: ServiceError | null;
}

/**
 * Get the most recent verification submission for a professional.
 */
export async function getMyVerification(
  professionalId: string
): Promise<ServiceResponse<ProfessionalVerification | null>> {
  try {
    const { data, error } = await supabase
      .from('professional_verifications')
      .select('*')
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { data: null, error: { message: error.message } };
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err.message } };
  }
}

/**
 * Submit (or resubmit after rejection) a verification request.
 * Uploads documents to private storage, inserts a verification row,
 * and updates professionals.verification_status to 'pending'.
 */
export async function submitVerification(
  professionalId: string,
  userId: string,
  idDocumentUri: string,
  certificateUris: string[],
  notes?: string
): Promise<ServiceResponse<ProfessionalVerification>> {
  try {
    // Upload government ID
    const idPath = await uploadVerificationDoc(idDocumentUri, userId, 'id');

    // Upload certificates (may be empty)
    const certPaths: string[] = [];
    for (const uri of certificateUris) {
      const path = await uploadVerificationDoc(uri, userId, 'certificate');
      certPaths.push(path);
    }

    // Insert verification row
    const { data: verRow, error: insertError } = await supabase
      .from('professional_verifications')
      .insert({
        professional_id: professionalId,
        status: 'pending',
        id_document_path: idPath,
        certificate_paths: certPaths,
        submission_notes: notes || null,
      })
      .select()
      .single();

    if (insertError) return { data: null, error: { message: insertError.message } };

    // Update professional's verification_status to 'pending'
    await supabase
      .from('professional_profiles')
      .update({ verification_status: 'pending' })
      .eq('id', professionalId);

    return { data: verRow as ProfessionalVerification, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err.message } };
  }
}
