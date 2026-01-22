/**
 * Campaign Groups resource
 */
import type { HttpClient } from '../http';
import type { CampaignGroup, CreateCampaignGroupInput, Campaign } from '../types';

export class CampaignGroupsResource {
  constructor(private http: HttpClient) {}

  /**
   * List all campaign groups
   */
  async list(): Promise<CampaignGroup[]> {
    return this.http.get<CampaignGroup[]>('/campaign-groups');
  }

  /**
   * Get a campaign group by ID
   */
  async get(id: string): Promise<CampaignGroup> {
    return this.http.get<CampaignGroup>(`/campaign-groups/${id}`);
  }

  /**
   * Create a new campaign group
   */
  async create(input: CreateCampaignGroupInput): Promise<CampaignGroup> {
    return this.http.post<CampaignGroup>('/campaign-groups', input);
  }

  /**
   * Update a campaign group
   */
  async update(id: string, input: Partial<CreateCampaignGroupInput>): Promise<CampaignGroup> {
    return this.http.patch<CampaignGroup>(`/campaign-groups/${id}`, input);
  }

  /**
   * Delete a campaign group
   */
  async delete(id: string): Promise<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/campaign-groups/${id}`);
  }

  /**
   * Get campaigns in this group
   */
  async getCampaigns(id: string): Promise<Campaign[]> {
    return this.http.get<Campaign[]>(`/campaign-groups/${id}/campaigns`);
  }
}
