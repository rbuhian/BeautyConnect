/**
 * Network utility functions for handling API calls with retries, timeouts, and error handling
 */

export interface NetworkOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export interface NetworkError extends Error {
  code?: string;
  statusCode?: number;
  isNetworkError: boolean;
  isTimeout: boolean;
  isRetryable: boolean;
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second

/**
 * Creates a network error with additional metadata
 */
export function createNetworkError(
  message: string,
  options: Partial<NetworkError> = {}
): NetworkError {
  const error = new Error(message) as NetworkError;
  error.isNetworkError = true;
  error.isTimeout = options.isTimeout || false;
  error.isRetryable = options.isRetryable || false;
  error.code = options.code;
  error.statusCode = options.statusCode;
  return error;
}

/**
 * Determines if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Network errors are retryable
  if (!navigator.onLine) return true;

  // Timeout errors are retryable
  if (error.isTimeout) return true;

  // Specific error codes that are retryable
  const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'ECONNABORTED', 'ETIMEDOUT'];
  if (retryableCodes.includes(error.code)) return true;

  // HTTP status codes that are retryable (5xx server errors, 429 rate limit)
  if (error.statusCode >= 500 || error.statusCode === 429) return true;

  return false;
}

/**
 * Delays execution for a specified time
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executes a function with timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(createNetworkError('Request timeout', {
        code: 'TIMEOUT',
        isTimeout: true,
        isRetryable: true,
      }));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Executes an async function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: NetworkOptions = {}
): Promise<T> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Execute function with timeout
      const result = await withTimeout(fn(), timeout);
      return result;
    } catch (error: any) {
      lastError = error;

      // Don't retry if not retryable or if this was the last attempt
      if (!isRetryableError(error) || attempt === retries) {
        throw error;
      }

      // Call onRetry callback
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // Wait before retrying with exponential backoff
      const waitTime = retryDelay * Math.pow(2, attempt);
      await delay(waitTime);
    }
  }

  throw lastError!;
}

/**
 * Gets a user-friendly error message from an error object
 */
export function getUserFriendlyErrorMessage(error: any): string {
  // Network offline
  if (!navigator.onLine) {
    return 'No internet connection. Please check your network and try again.';
  }

  // Timeout
  if (error.isTimeout) {
    return 'Request timed out. Please check your connection and try again.';
  }

  // Server errors
  if (error.statusCode >= 500) {
    return 'Server error. Please try again later.';
  }

  // Rate limiting
  if (error.statusCode === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // Authentication errors
  if (error.statusCode === 401 || error.statusCode === 403) {
    return 'Authentication error. Please log in again.';
  }

  // Not found
  if (error.statusCode === 404) {
    return 'Resource not found. Please try again.';
  }

  // Bad request
  if (error.statusCode === 400) {
    return error.message || 'Invalid request. Please check your input.';
  }

  // Supabase specific errors
  if (error.message) {
    // JWT expired
    if (error.message.includes('JWT expired')) {
      return 'Session expired. Please log in again.';
    }

    // Database connection
    if (error.message.includes('database')) {
      return 'Database connection error. Please try again.';
    }

    // Return the actual error message if it's user-friendly
    if (error.message.length < 100 && !error.message.includes('Error:')) {
      return error.message;
    }
  }

  // Generic error
  return 'Something went wrong. Please try again.';
}

/**
 * Checks network connectivity
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Waits for network to be available
 */
export function waitForNetwork(timeoutMs: number = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isOnline()) {
      resolve();
      return;
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener('online', onOnline);
      reject(createNetworkError('Network timeout', {
        code: 'NETWORK_TIMEOUT',
        isTimeout: true,
        isRetryable: false,
      }));
    }, timeoutMs);

    const onOnline = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('online', onOnline);
      resolve();
    };

    window.addEventListener('online', onOnline);
  });
}
