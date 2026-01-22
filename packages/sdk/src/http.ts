/**
 * Base HTTP client for EmailOps SDK
 */
import type { ApiError, EmailOpsConfig } from './types';

export class HttpClient {
  private baseUrl: string;
  private workspaceId: string;
  private headers: Record<string, string>;
  private fetchFn: typeof fetch;

  constructor(config: EmailOpsConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.workspaceId = config.workspaceId || 'ws_default';
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    this.fetchFn = config.fetch || fetch;
  }

  get workspace(): string {
    return this.workspaceId;
  }

  private async request<T>(
    method: string,
    path: string,
    options: {
      body?: unknown;
      params?: Record<string, string | number | boolean | undefined>;
    } = {}
  ): Promise<T> {
    // Build URL with query params
    let url = `${this.baseUrl}${path}`;

    // Add workspaceId to params if not already in path
    const params: Record<string, string> = {
      workspaceId: this.workspaceId,
    };

    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined) {
          params[key] = String(value);
        }
      }
    }

    const queryString = new URLSearchParams(params).toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }

    // Make request
    const response = await this.fetchFn(url, {
      method,
      headers: this.headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // Handle errors
    if (!response.ok) {
      let error: ApiError;
      try {
        const json = await response.json();
        error = json as ApiError;
      } catch {
        error = {
          statusCode: response.status,
          message: response.statusText,
        };
      }
      throw new EmailOpsError(error.message, error.statusCode, error);
    }

    // Parse response
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text as unknown as T;
    }
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', path, { params });
  }

  async post<T>(path: string, body?: unknown, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('POST', path, { body, params });
  }

  async patch<T>(path: string, body?: unknown, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('PATCH', path, { body, params });
  }

  async put<T>(path: string, body?: unknown, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('PUT', path, { body, params });
  }

  async delete<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('DELETE', path, { params });
  }
}

/**
 * Custom error class for EmailOps API errors
 */
export class EmailOpsError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: ApiError
  ) {
    super(message);
    this.name = 'EmailOpsError';
  }
}
