/**
 * Sender Profiles resource
 */
import type { HttpClient } from '../http';
import type { SenderProfile, CreateSenderProfileInput } from '../types';

export class SenderProfilesResource {
  constructor(private http: HttpClient) {}

  /**
   * List all sender profiles
   */
  async list(): Promise<SenderProfile[]> {
    return this.http.get<SenderProfile[]>('/sender-profiles');
  }

  /**
   * Get a sender profile by ID
   */
  async get(id: string): Promise<SenderProfile> {
    return this.http.get<SenderProfile>(`/sender-profiles/${id}`);
  }

  /**
   * Create a new sender profile
   */
  async create(input: CreateSenderProfileInput): Promise<SenderProfile> {
    return this.http.post<SenderProfile>('/sender-profiles', input);
  }

  /**
   * Update a sender profile
   */
  async update(id: string, input: Partial<CreateSenderProfileInput>): Promise<SenderProfile> {
    return this.http.patch<SenderProfile>(`/sender-profiles/${id}`, input);
  }

  /**
   * Delete a sender profile
   */
  async delete(id: string): Promise<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/sender-profiles/${id}`);
  }
}
