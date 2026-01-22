/**
 * EmailOps SDK
 *
 * A TypeScript SDK for interacting with the EmailOps API.
 *
 * @example
 * ```typescript
 * import { EmailOps } from '@emailops/sdk';
 *
 * const client = new EmailOps({
 *   baseUrl: 'https://your-emailops-api.com',
 *   workspaceId: 'ws_abc123',
 * });
 *
 * // List all campaigns
 * const campaigns = await client.campaigns.list();
 *
 * // Create a new campaign
 * const campaign = await client.campaigns.create({
 *   name: 'Welcome Email',
 *   templateId: 'tpl_123',
 *   segmentId: 'seg_456',
 *   senderProfileId: 'sp_789',
 * });
 *
 * // Trigger the campaign
 * await client.campaigns.trigger(campaign.id);
 * ```
 */

import { HttpClient, EmailOpsError } from './http';
import type { EmailOpsConfig } from './types';

import {
  CampaignsResource,
  TemplatesResource,
  SegmentsResource,
  SenderProfilesResource,
  CampaignGroupsResource,
  DataConnectorsResource,
  EmailConnectorsResource,
  SuppressionsResource,
  AnalyticsResource,
} from './resources';

export class EmailOps {
  private http: HttpClient;

  /** Campaigns (Single Sends) - create and trigger one-time email sends */
  public readonly campaigns: CampaignsResource;

  /** Templates - manage email templates and versions */
  public readonly templates: TemplatesResource;

  /** Segments - define recipient groups using SQL queries */
  public readonly segments: SegmentsResource;

  /** Sender Profiles - manage sender identities */
  public readonly senderProfiles: SenderProfilesResource;

  /** Campaign Groups - organize campaigns and handle collisions */
  public readonly campaignGroups: CampaignGroupsResource;

  /** Data Connectors - connect to databases for segments */
  public readonly dataConnectors: DataConnectorsResource;

  /** Email Connectors - configure email providers (SES, Resend, SMTP) */
  public readonly emailConnectors: EmailConnectorsResource;

  /** Suppressions - manage email suppression list */
  public readonly suppressions: SuppressionsResource;

  /** Analytics - view email metrics and statistics */
  public readonly analytics: AnalyticsResource;

  constructor(config: EmailOpsConfig) {
    this.http = new HttpClient(config);

    this.campaigns = new CampaignsResource(this.http);
    this.templates = new TemplatesResource(this.http);
    this.segments = new SegmentsResource(this.http);
    this.senderProfiles = new SenderProfilesResource(this.http);
    this.campaignGroups = new CampaignGroupsResource(this.http);
    this.dataConnectors = new DataConnectorsResource(this.http);
    this.emailConnectors = new EmailConnectorsResource(this.http);
    this.suppressions = new SuppressionsResource(this.http);
    this.analytics = new AnalyticsResource(this.http);
  }

  /**
   * Get the current workspace ID
   */
  get workspaceId(): string {
    return this.http.workspace;
  }
}

// Re-export types for convenience
export * from './types';
export { EmailOpsError } from './http';

// Default export
export default EmailOps;
