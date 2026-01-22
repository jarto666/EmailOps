/**
 * Campaigns (Single Sends) resource
 */
import type { HttpClient } from '../http';
import type {
  Campaign,
  CreateCampaignInput,
  UpdateCampaignInput,
  CampaignRun,
} from '../types';

export class CampaignsResource {
  constructor(private http: HttpClient) {}

  /**
   * List all campaigns
   */
  async list(): Promise<Campaign[]> {
    return this.http.get<Campaign[]>('/single-sends');
  }

  /**
   * Get a campaign by ID
   */
  async get(id: string): Promise<Campaign> {
    return this.http.get<Campaign>(`/single-sends/${id}`);
  }

  /**
   * Create a new campaign
   */
  async create(input: CreateCampaignInput): Promise<Campaign> {
    return this.http.post<Campaign>('/single-sends', input);
  }

  /**
   * Update a campaign
   */
  async update(id: string, input: UpdateCampaignInput): Promise<Campaign> {
    return this.http.patch<Campaign>(`/single-sends/${id}`, input);
  }

  /**
   * Delete a campaign
   */
  async delete(id: string): Promise<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/single-sends/${id}`);
  }

  /**
   * Trigger a campaign to start sending
   */
  async trigger(id: string): Promise<CampaignRun> {
    return this.http.post<CampaignRun>(`/single-sends/${id}/trigger`);
  }

  /**
   * Get campaign runs (send history)
   */
  async getRuns(id: string): Promise<CampaignRun[]> {
    return this.http.get<CampaignRun[]>(`/single-sends/${id}/runs`);
  }

  /**
   * Activate a campaign (set status to ACTIVE)
   */
  async activate(id: string): Promise<Campaign> {
    return this.update(id, { status: 'ACTIVE' });
  }

  /**
   * Pause a campaign
   */
  async pause(id: string): Promise<Campaign> {
    return this.update(id, { status: 'PAUSED' });
  }
}
