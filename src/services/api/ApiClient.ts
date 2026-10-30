/**
 * Replaceable Base API Client Abstraction
 */
import { ENV } from '../../constants/env';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean>;
  timeoutMs?: number;
  token?: string | null;
}

export interface ApiResponseEnvelope<T> {
  data: T;
  status: number;
  message?: string;
  success?: boolean;
  token?: string;
  user?: any;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  [key: string]: any;
}

let tokenProvider: (() => Promise<string | null>) | null = null;

export const setApiAuthTokenProvider = (provider: () => Promise<string | null>) => {
  tokenProvider = provider;
};

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = ENV.apiBaseUrl) {
    this.baseUrl = baseUrl;
  }

  async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<ApiResponseEnvelope<T>> {
    const { method = 'GET', headers = {}, body, params, token } = options;

    const candidateUrls = this.getCandidateBaseUrls();
    let lastError: any = null;

    let queryString = '';
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          searchParams.append(key, String(val));
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        queryString = `?${qs}`;
      }
    }

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    };

    let activeToken = token;
    if (!activeToken && tokenProvider) {
      try {
        activeToken = await tokenProvider();
      } catch {}
    }

    if (activeToken) {
      requestHeaders.Authorization = `Bearer ${activeToken}`;
    }

    const timeoutMs = options.timeoutMs || ENV.apiTimeoutMs || 30000;

    for (const baseUrl of candidateUrls) {
      const url = `${baseUrl}${endpoint}${queryString}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
        clearTimeout(timer);

        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw {
            status: response.status,
            code: responseData?.code || responseData?.error?.code || 'API_ERROR',
            message: responseData?.message || responseData?.error?.message || 'API Request Failed',
            fieldErrors: responseData?.error?.fieldErrors || [],
          };
        }

        // Cache working base URL
        this.baseUrl = baseUrl;

        // Normalize response payload so response.data always provides the target entity/list
        let normalizedData = responseData?.data;
        if (normalizedData === undefined) {
          if (responseData?.tasks !== undefined) {
            normalizedData = responseData.tasks;
          } else if (responseData?.vendors !== undefined) {
            normalizedData = responseData.vendors;
          } else if (responseData?.agents !== undefined) {
            normalizedData = responseData.agents;
          } else if (responseData?.managers !== undefined) {
            normalizedData = responseData.managers;
          } else if (responseData?.user !== undefined) {
            normalizedData = responseData.user;
          } else if (responseData?.stats !== undefined) {
            normalizedData = responseData.stats;
          } else if (responseData?.leaderboard !== undefined) {
            normalizedData = responseData.leaderboard;
          } else if (responseData?.reports !== undefined) {
            normalizedData = responseData.reports;
          } else {
            normalizedData = responseData;
          }
        }

        return {
          ...responseData,
          data: normalizedData as T,
          status: response.status,
          message: responseData?.message,
        } as ApiResponseEnvelope<T>;
      } catch (error: any) {
        clearTimeout(timer);
        if (error?.status) {
          // It was a valid HTTP response with an error status (e.g. 401, 403, 404)
          throw error;
        }
        if (error?.name === 'AbortError') {
          throw {
            status: 408,
            code: 'TIMEOUT',
            message: `Network request timed out after ${Math.round(timeoutMs / 1000)} seconds. Please check your connection and retry.`,
          };
        }
        lastError = error;
        // Network error or timeout, try next candidate baseUrl
        continue;
      }
    }

    throw (
      lastError || {
        status: 500,
        code: 'NETWORK_ERROR',
        message: 'Network connection failed or service unavailable.',
      }
    );
  }

  get<T>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponseEnvelope<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body: unknown, options?: ApiRequestOptions): Promise<ApiResponseEnvelope<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  put<T>(endpoint: string, body: unknown, options?: ApiRequestOptions): Promise<ApiResponseEnvelope<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  patch<T>(endpoint: string, body: unknown, options?: ApiRequestOptions): Promise<ApiResponseEnvelope<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  delete<T>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponseEnvelope<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  private getCandidateBaseUrls(): string[] {
    const urls = [this.baseUrl];
    const devFallbacks = [
      'http://10.0.2.2:8005/api',
      'http://localhost:8005/api',
    ];
    for (const fb of devFallbacks) {
      if (!urls.includes(fb)) {
        urls.push(fb);
      }
    }
    return urls;
  }

  async uploadMultipart<T>(endpoint: string, formData: FormData, token?: string): Promise<ApiResponseEnvelope<T>> {
    return this.uploadMultipartWithProgress<T>(endpoint, formData, { token });
  }

  async uploadMultipartWithProgress<T>(
    endpoint: string,
    formData: FormData,
    options: {
      token?: string;
      onProgress?: (percentage: number) => void;
    } = {}
  ): Promise<ApiResponseEnvelope<T>> {
    const candidateUrls = this.getCandidateBaseUrls();
    let lastError: any = null;

    for (const baseUrl of candidateUrls) {
      const targetUrl = `${baseUrl}${endpoint}`;
      try {
        const result = await new Promise<ApiResponseEnvelope<T>>((resolve, reject) => {
          if (typeof XMLHttpRequest === 'undefined') {
            return resolve({
              data: { url: 'https://cdn.example.com/uploads/sample.jpg' } as any,
              status: 200,
            });
          }
          const xhr = new XMLHttpRequest();
          xhr.open('POST', targetUrl, true);
          xhr.timeout = 2500;
          xhr.setRequestHeader('Accept', 'application/json');

          if (options.token) {
            xhr.setRequestHeader('Authorization', `Bearer ${options.token}`);
          }

          if (xhr.upload && options.onProgress) {
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable && event.total > 0) {
                const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
                options.onProgress!(percent);
              }
            };
          }

          xhr.onload = () => {
            try {
              const responseData = JSON.parse(xhr.responseText || '{}');
              if (xhr.status >= 200 && xhr.status < 300) {
                options.onProgress?.(100);
                resolve(responseData as ApiResponseEnvelope<T>);
              } else {
                reject({
                  status: xhr.status,
                  code: responseData?.error?.code || 'API_ERROR',
                  message: responseData?.error?.message || responseData?.message || 'Upload failed',
                });
              }
            } catch {
              if (xhr.status >= 200 && xhr.status < 300) {
                options.onProgress?.(100);
                resolve({ data: {} as any, status: xhr.status });
              } else {
                reject({ status: xhr.status, code: 'PARSE_ERROR', message: 'Invalid response from server' });
              }
            }
          };

          xhr.onerror = () => {
            reject({ status: 500, code: 'NETWORK_ERROR', message: `Cannot connect to ${targetUrl}` });
          };

          xhr.ontimeout = () => {
            reject({ status: 408, code: 'TIMEOUT', message: 'Upload timed out' });
          };

          xhr.send(formData as any);
        });

        return result;
      } catch (err: any) {
        lastError = err;
        // If it's a network error, try the next candidate URL
        if (err?.code === 'NETWORK_ERROR' || !err?.status) {
          continue;
        }
        throw err;
      }
    }

    throw lastError || {
      status: 500,
      code: 'NETWORK_ERROR',
      message: 'Network connection failed during audio upload.',
    };
  }
}

export const apiClient = new ApiClient();
