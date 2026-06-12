import { supabase } from './supabase';

/**
 * Upload an image to Supabase Storage
 * @param uri - Local URI of the image to upload
 * @param bucket - Storage bucket name ('avatars' or 'portfolios')
 * @returns Public URL of the uploaded image
 */
export async function uploadImage(uri: string, bucket: 'avatars' | 'portfolios'): Promise<string> {
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

  // Convert image to ArrayBuffer for React Native
  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrl;
}

/**
 * Upload a verification document to the private verifications bucket.
 * Returns the storage path (not a public URL).
 */
export async function uploadVerificationDoc(
  uri: string,
  userId: string,
  type: 'id' | 'certificate'
): Promise<string> {
  const fileName = `${Date.now()}.jpg`;
  const path = `${userId}/${type}/${fileName}`;

  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from('verifications')
    .upload(path, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) throw error;
  return path;
}

/**
 * Generate a 1-hour signed URL for a private verification document.
 */
export async function getVerificationSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('verifications')
    .createSignedUrl(path, 3600);

  if (error) throw error;
  return data.signedUrl;
}

/**
 * Delete an image from Supabase Storage
 * @param url - Public URL of the image to delete
 * @param bucket - Storage bucket name
 */
export async function deleteImage(url: string, bucket: 'avatars' | 'portfolios'): Promise<void> {
  // Extract file name from URL
  const urlParts = url.split('/');
  const fileName = urlParts[urlParts.length - 1];

  if (!fileName) return;

  const { error } = await supabase.storage
    .from(bucket)
    .remove([fileName]);

  if (error) {
    console.error('Error deleting image:', error);
  }
}
