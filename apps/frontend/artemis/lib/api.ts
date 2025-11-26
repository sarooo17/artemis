/**
 * Fetch wrapper that automatically includes credentials (cookies) and CSRF token
 */

const API_BASE_URL = 'http://localhost:3001/api';

interface FetchOptions extends RequestInit {
  skipCsrf?: boolean;
}

/**
 * Get CSRF token from cookie
 */
function getCsrfToken(): string | null {
  const match = document.cookie.match(/csrfToken=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Authenticated fetch with automatic cookie and CSRF handling
 */
export async function authFetch(url: string, options: FetchOptions = {}): Promise<Response> {
  const { skipCsrf, headers, ...restOptions } = options;
  
  // Build headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };
  
  // Add CSRF token for mutating operations
  if (!skipCsrf && options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase())) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      requestHeaders['X-CSRF-Token'] = csrfToken;
    }
  }
  
  try {
    // Make request with credentials (cookies)
    const response = await fetch(url.startsWith('http') ? url : `${API_BASE_URL}${url}`, {
      ...restOptions,
      headers: requestHeaders,
      credentials: 'include', // Always include HttpOnly cookies
    });
    
    return response;
  } catch (error) {
    // Re-throw with additional context
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error(`Network error: Unable to reach server at ${API_BASE_URL}`);
    }
    throw error;
  }
}

/**
 * Convenience methods
 */
export const api = {
  get: (url: string, options?: FetchOptions) => authFetch(url, { ...options, method: 'GET' }),
  post: (url: string, body?: any, options?: FetchOptions) => authFetch(url, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: (url: string, body?: any, options?: FetchOptions) => authFetch(url, { ...options, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: (url: string, body?: any, options?: FetchOptions) => authFetch(url, { ...options, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: (url: string, options?: FetchOptions) => authFetch(url, { ...options, method: 'DELETE' }),
  
  // Chat endpoints
  chat: {
    orchestrate: `${API_BASE_URL}/chat/orchestrate`,
    orchestrateStream: `${API_BASE_URL}/chat/orchestrate/stream`,
  },
};
