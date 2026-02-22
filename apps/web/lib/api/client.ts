const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

interface RequestOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(options?: RequestOptions): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    const token = options?.token || this.getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  async request<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getHeaders(options);

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle 401 - Token expired
      if (response.status === 401 && endpoint !== '/api/v1/auth/refresh') {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry the original request
          const newHeaders = this.getHeaders(options);
          const retryResponse = await fetch(url, {
            ...options,
            headers: newHeaders,
          });
          const retryData = await retryResponse.json();
          if (!retryResponse.ok) {
            throw new Error(retryData.message || retryData.error || 'Request failed');
          }
          return retryData;
        } else {
          this.clearTokens();
          window.location.href = '/login';
          throw new Error('Session expired');
        }
      }

      throw new Error(data.message || data.error || 'Request failed');
    }

    // Store tokens if present in response
    if (data.accessToken && data.refreshToken) {
      this.setTokens(data.accessToken, data.refreshToken);
    }

    return data;
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;

      const response = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      this.setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  // Auth endpoints
  async register(data: {
    email: string;
    password: string;
    name?: string;
    tenantSlug: string;
    tenantName: string;
  }) {
    return this.request<{
      message: string;
      user: AuthUser;
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: { email: string; password: string }) {
    return this.request<{
      message: string;
      user: AuthUser;
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout() {
    try {
      await this.request('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      this.clearTokens();
    }
  }

  async getMe() {
    return this.request<{ user: AuthUser }>('/api/v1/auth/me');
  }

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    return this.request<{ message: string }>('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logoutAll() {
    return this.request<{ message: string }>('/api/v1/auth/logout-all', {
      method: 'POST',
    });
  }
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatar?: string | null;
  role: string;
  tenantId: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    plan?: string;
  };
}

export const api = new ApiClient(API_URL);
