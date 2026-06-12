/**
 * Image optimization utilities for compression, resizing, and caching
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Image } from 'react-native';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: 'jpeg' | 'png';
}

export interface OptimizedImage {
  uri: string;
  width: number;
  height: number;
  size: number; // bytes
}

const DEFAULT_MAX_WIDTH = 1920;
const DEFAULT_MAX_HEIGHT = 1920;
const DEFAULT_QUALITY = 0.8;
const DEFAULT_FORMAT = 'jpeg';

// Cache directory for optimized images
const CACHE_DIR = `${(FileSystem as any).cacheDirectory || ''}images/`;

/**
 * Ensures cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

/**
 * Gets image dimensions
 */
function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error)
    );
  });
}

/**
 * Calculates optimal dimensions maintaining aspect ratio
 */
function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  // If image is already smaller, return original dimensions
  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return { width: originalWidth, height: originalHeight };
  }

  const aspectRatio = originalWidth / originalHeight;

  let targetWidth = originalWidth;
  let targetHeight = originalHeight;

  // Scale down if width exceeds max
  if (targetWidth > maxWidth) {
    targetWidth = maxWidth;
    targetHeight = targetWidth / aspectRatio;
  }

  // Scale down if height exceeds max
  if (targetHeight > maxHeight) {
    targetHeight = maxHeight;
    targetWidth = targetHeight * aspectRatio;
  }

  return {
    width: Math.round(targetWidth),
    height: Math.round(targetHeight),
  };
}

/**
 * Optimizes an image (compress and resize)
 */
export async function optimizeImage(
  uri: string,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImage> {
  const {
    maxWidth = DEFAULT_MAX_WIDTH,
    maxHeight = DEFAULT_MAX_HEIGHT,
    quality = DEFAULT_QUALITY,
    format = DEFAULT_FORMAT,
  } = options;

  try {
    // Get original dimensions
    const { width: originalWidth, height: originalHeight } = await getImageDimensions(uri);

    // Calculate optimal dimensions
    const { width, height } = calculateOptimalDimensions(
      originalWidth,
      originalHeight,
      maxWidth,
      maxHeight
    );

    // Prepare manipulation actions
    const actions: any[] = [];

    // Only resize if dimensions changed
    if (width !== originalWidth || height !== originalHeight) {
      actions.push({
        resize: { width, height },
      });
    }

    // Manipulate image
    const result = await ImageManipulator.manipulateAsync(
      uri,
      actions,
      {
        compress: quality,
        format: format === 'jpeg' ? ImageManipulator.SaveFormat.JPEG : ImageManipulator.SaveFormat.PNG,
      }
    );

    // Get file size
    const fileInfo = await FileSystem.getInfoAsync(result.uri);
    const size = (fileInfo as any).size || 0;

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
      size,
    };
  } catch (error) {
    console.error('Error optimizing image:', error);
    throw new Error('Failed to optimize image');
  }
}

/**
 * Optimizes multiple images in parallel
 */
export async function optimizeImages(
  uris: string[],
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImage[]> {
  return Promise.all(uris.map(uri => optimizeImage(uri, options)));
}

/**
 * Generates a cache key from URI
 */
function getCacheKey(uri: string): string {
  // Use last part of URI as cache key
  const parts = uri.split('/');
  return parts[parts.length - 1];
}

/**
 * Caches an optimized image
 */
export async function cacheImage(uri: string): Promise<string> {
  try {
    await ensureCacheDir();

    const cacheKey = getCacheKey(uri);
    const cachedUri = `${CACHE_DIR}${cacheKey}`;

    // Check if already cached
    const cacheInfo = await FileSystem.getInfoAsync(cachedUri);
    if (cacheInfo.exists) {
      return cachedUri;
    }

    // Copy to cache
    await FileSystem.copyAsync({
      from: uri,
      to: cachedUri,
    });

    return cachedUri;
  } catch (error) {
    console.error('Error caching image:', error);
    return uri; // Return original URI if caching fails
  }
}

/**
 * Gets a cached image if it exists
 */
export async function getCachedImage(uri: string): Promise<string | null> {
  try {
    const cacheKey = getCacheKey(uri);
    const cachedUri = `${CACHE_DIR}${cacheKey}`;

    const cacheInfo = await FileSystem.getInfoAsync(cachedUri);
    if (cacheInfo.exists) {
      return cachedUri;
    }

    return null;
  } catch (error) {
    console.error('Error getting cached image:', error);
    return null;
  }
}

/**
 * Clears image cache
 */
export async function clearImageCache(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    }
  } catch (error) {
    console.error('Error clearing image cache:', error);
  }
}

/**
 * Gets cache size in bytes
 */
export async function getCacheSize(): Promise<number> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
      return 0;
    }

    const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
    let totalSize = 0;

    for (const file of files) {
      const fileInfo = await FileSystem.getInfoAsync(`${CACHE_DIR}${file}`);
      totalSize += (fileInfo as any).size || 0;
    }

    return totalSize;
  } catch (error) {
    console.error('Error getting cache size:', error);
    return 0;
  }
}

/**
 * Formats bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

/**
 * Optimizes image for avatar upload (smaller size)
 */
export async function optimizeAvatar(uri: string): Promise<OptimizedImage> {
  return optimizeImage(uri, {
    maxWidth: 500,
    maxHeight: 500,
    quality: 0.85,
    format: 'jpeg',
  });
}

/**
 * Optimizes image for portfolio upload
 */
export async function optimizePortfolioImage(uri: string): Promise<OptimizedImage> {
  return optimizeImage(uri, {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.85,
    format: 'jpeg',
  });
}
