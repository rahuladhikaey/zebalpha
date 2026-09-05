/**
 * Production-Ready API Client for ZEBALPHA Marketplace Frontends
 * Interconnects Frontends with Express Backend API (https://zebalpha-backend-hlk5.onrender.com)
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://zebalpha-backend-hlk5.onrender.com';

interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
}

interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
  success?: boolean;
}

const getStoredToken = (type: 'access' | 'refresh'): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`zebalpha_${type}_token`) || localStorage.getItem(`asaliswad_${type}_token`);
};

const setStoredToken = (type: 'access' | 'refresh', token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`zebalpha_${type}_token`, token);
  }
};

export const apiFetch = async <T = any>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<ApiResponse<T>> => {
  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const accessToken = getStoredToken('access');
    if (accessToken) {
      defaultHeaders['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return { data: null, error: result.error || result.message || `HTTP Error ${response.status}` };
    }

    return { data: result, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Network request failed' };
  }
};
