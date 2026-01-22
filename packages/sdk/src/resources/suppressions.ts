/**
 * Suppressions resource
 */
import type { HttpClient } from '../http';
import type { Suppression, CreateSuppressionInput, PaginatedResponse } from '../types';

export class SuppressionsResource {
  constructor(private http: HttpClient) {}

  /**
   * List suppressions with optional pagination
   */
  async list(options?: { page?: number; limit?: number }): Promise<PaginatedResponse<Suppression>> {
    return this.http.get<PaginatedResponse<Suppression>>('/suppressions', options);
  }

  /**
   * Check if an email is suppressed
   */
  async check(email: string): Promise<{ suppressed: boolean; suppression?: Suppression }> {
    return this.http.get<{ suppressed: boolean; suppression?: Suppression }>(`/suppressions/check`, { email });
  }

  /**
   * Add an email to the suppression list
   */
  async create(input: CreateSuppressionInput): Promise<Suppression> {
    return this.http.post<Suppression>('/suppressions', input);
  }

  /**
   * Bulk add emails to suppression list
   */
  async createBulk(emails: CreateSuppressionInput[]): Promise<{ created: number }> {
    return this.http.post<{ created: number }>('/suppressions/bulk', { emails });
  }

  /**
   * Remove an email from suppression list
   */
  async delete(id: string): Promise<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/suppressions/${id}`);
  }

  /**
   * Remove suppression by email address
   */
  async deleteByEmail(email: string): Promise<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/suppressions/email/${encodeURIComponent(email)}`);
  }
}
