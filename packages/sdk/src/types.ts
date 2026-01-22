/**
 * EmailOps SDK Types
 * Clean, user-friendly types for the SDK
 */

// ============================================================================
// Client Configuration
// ============================================================================

export interface EmailOpsConfig {
  /** Base URL of the EmailOps API (e.g., "http://localhost:3300") */
  baseUrl: string;
  /** Workspace ID (defaults to "ws_default") */
  workspaceId?: string;
  /** Custom fetch implementation (optional) */
  fetch?: typeof fetch;
  /** Request headers (optional) */
  headers?: Record<string, string>;
}

// ============================================================================
// Campaigns (Single Sends)
// ============================================================================

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  templateId: string;
  segmentId: string;
  senderProfileId: string;
  campaignGroupId?: string;
  priority: number;
  scheduleType: 'MANUAL' | 'SCHEDULED';
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  templateId: string;
  segmentId: string;
  senderProfileId: string;
  campaignGroupId?: string;
  priority?: number;
  scheduleType?: 'MANUAL' | 'SCHEDULED';
  scheduledAt?: string;
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string;
  templateId?: string;
  segmentId?: string;
  senderProfileId?: string;
  campaignGroupId?: string;
  priority?: number;
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED';
}

export interface CampaignRun {
  id: string;
  status: string;
  stats?: Record<string, number>;
  createdAt: string;
  completedAt?: string;
}

// ============================================================================
// Templates
// ============================================================================

export interface Template {
  id: string;
  key: string;
  name: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
  versions?: TemplateVersion[];
  activeVersion?: TemplateVersion;
}

export interface TemplateVersion {
  id: string;
  version: number;
  subject: string;
  preheader?: string;
  bodyHtml?: string;
  bodyMjml?: string;
  bodyJson?: Record<string, unknown>;
  mode: 'RAW_HTML' | 'RAW_MJML' | 'BUILDER';
  active: boolean;
  createdAt: string;
}

export interface CreateTemplateInput {
  key: string;
  name: string;
  category?: 'MARKETING' | 'TRANSACTIONAL' | 'BOTH';
}

export interface CreateTemplateVersionInput {
  subject: string;
  preheader?: string;
  bodyHtml?: string;
  bodyMjml?: string;
  bodyJson?: Record<string, unknown>;
  mode: 'RAW_HTML' | 'RAW_MJML' | 'BUILDER';
}

// ============================================================================
// Segments
// ============================================================================

export interface Segment {
  id: string;
  name: string;
  description?: string;
  dataConnectorId: string;
  sqlQuery: string;
  createdAt: string;
  updatedAt: string;
  dataConnector?: {
    id: string;
    name: string;
    type: string;
  };
}

export interface CreateSegmentInput {
  name: string;
  description?: string;
  dataConnectorId: string;
  sqlQuery: string;
}

export interface UpdateSegmentInput {
  name?: string;
  description?: string;
  dataConnectorId?: string;
  sqlQuery?: string;
}

export interface SegmentPreview {
  count: number;
  rows: Record<string, unknown>[];
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
    foundColumns: {
      id?: string;
      email?: string;
      vars?: string;
    };
  };
}

// ============================================================================
// Sender Profiles
// ============================================================================

export interface SenderProfile {
  id: string;
  name?: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  emailProviderConnectorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSenderProfileInput {
  name?: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  emailProviderConnectorId: string;
}

// ============================================================================
// Campaign Groups
// ============================================================================

export interface CampaignGroup {
  id: string;
  name: string;
  description?: string;
  collisionWindow: number;
  collisionPolicy: 'SEND_ALL' | 'HIGHEST_PRIORITY_WINS' | 'FIRST_SCHEDULED_WINS';
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignGroupInput {
  name: string;
  description?: string;
  collisionWindow?: number;
  collisionPolicy?: 'SEND_ALL' | 'HIGHEST_PRIORITY_WINS' | 'FIRST_SCHEDULED_WINS';
}

// ============================================================================
// Data Connectors
// ============================================================================

export interface DataConnector {
  id: string;
  name: string;
  type: 'POSTGRES' | 'BIGQUERY';
  createdAt: string;
  updatedAt: string;
}

export interface CreateDataConnectorInput {
  name: string;
  type: 'POSTGRES' | 'BIGQUERY';
  config: Record<string, unknown>;
}

// ============================================================================
// Email Connectors
// ============================================================================

export interface EmailConnector {
  id: string;
  name: string;
  type: 'SES' | 'RESEND' | 'SMTP';
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmailConnectorInput {
  name: string;
  type: 'SES' | 'RESEND' | 'SMTP';
  config: Record<string, unknown>;
}

// ============================================================================
// Suppressions
// ============================================================================

export interface Suppression {
  id: string;
  email: string;
  reason: 'BOUNCE' | 'COMPLAINT' | 'UNSUBSCRIBE' | 'MANUAL';
  source?: string;
  createdAt: string;
}

export interface CreateSuppressionInput {
  email: string;
  reason: 'BOUNCE' | 'COMPLAINT' | 'UNSUBSCRIBE' | 'MANUAL';
  source?: string;
}

// ============================================================================
// Analytics
// ============================================================================

export interface OverviewStats {
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalFailed: number;
  deliveryRate: number;
  activeCampaigns: number;
  totalSegments: number;
  totalTemplates: number;
}

export interface DailyMetric {
  date: string;
  sent: number;
  delivered: number;
  bounced: number;
  failed: number;
}

// ============================================================================
// Common
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
