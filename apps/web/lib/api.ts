// API Client for EmailOps
// All requests include workspaceId for single-tenant isolation

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3300";
const WORKSPACE_ID = "ws_default";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | undefined>;
};

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, params = {} } = options;

  // Always include workspaceId
  const queryParams = new URLSearchParams();
  queryParams.set("workspaceId", WORKSPACE_ID);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      queryParams.set(key, String(value));
    }
  });

  const url = `${API_URL}${endpoint}?${queryParams.toString()}`;

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// ANALYTICS
// =============================================================================

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

export interface RecentCampaign {
  id: string;
  name: string;
  status: string;
  lastRunAt: string | null;
  totalSent: number;
  deliveryRate: number;
}

export const analytics = {
  getOverview: () => request<OverviewStats>("/analytics/overview"),
  getDailyMetrics: (days = 30) =>
    request<DailyMetric[]>("/analytics/daily", { params: { days } }),
  getRecentCampaigns: (limit = 10) =>
    request<RecentCampaign[]>("/analytics/recent-campaigns", {
      params: { limit },
    }),
  getCampaignStats: (id: string) =>
    request<unknown>(`/analytics/campaigns/${id}`),
  getSkipReasons: (days = 7) =>
    request<unknown>("/analytics/skip-reasons", { params: { days } }),
};

// =============================================================================
// CAMPAIGNS (Single Sends)
// =============================================================================

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED" | "COMPLETED";
  templateId: string;
  template?: Template;
  segmentId: string;
  segment?: Segment;
  senderProfileId: string;
  senderProfile?: SenderProfile;
  campaignGroupId: string | null;
  campaignGroup?: CampaignGroup | null;
  priority: number;
  scheduleType: "MANUAL" | "CRON";
  cronExpression: string | null;
  createdAt: string;
  updatedAt: string;
  runs?: CampaignRun[];
}

export interface CampaignRun {
  id: string;
  status: string;
  stats: {
    total: number;
    sent: number;
    failed: number;
    skipped: number;
  } | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface CreateCampaignDto {
  workspaceId: string;
  name: string;
  description?: string;
  templateId: string;
  segmentId: string;
  senderProfileId: string;
  campaignGroupId?: string;
  priority?: number;
  scheduleType?: "MANUAL" | "CRON";
  cronExpression?: string;
}

export interface UpdateCampaignDto {
  name?: string;
  description?: string;
  status?: Campaign["status"];
  templateId?: string;
  segmentId?: string;
  senderProfileId?: string;
  campaignGroupId?: string | null;
  priority?: number;
  scheduleType?: "MANUAL" | "CRON";
  cronExpression?: string | null;
}

export const campaigns = {
  list: () => request<Campaign[]>("/single-sends"),
  get: (id: string) => request<Campaign>(`/single-sends/${id}`),
  create: (data: Omit<CreateCampaignDto, "workspaceId">) =>
    request<Campaign>("/single-sends", {
      method: "POST",
      body: { ...data, workspaceId: WORKSPACE_ID },
    }),
  update: (id: string, data: UpdateCampaignDto) =>
    request<Campaign>(`/single-sends/${id}`, { method: "PATCH", body: data }),
  delete: (id: string) =>
    request<void>(`/single-sends/${id}`, { method: "DELETE" }),
  trigger: (id: string) =>
    request<CampaignRun>(`/single-sends/${id}/trigger`, {
      method: "POST",
      body: {},
    }),
};

// =============================================================================
// CAMPAIGN GROUPS
// =============================================================================

export interface CampaignGroup {
  id: string;
  name: string;
  description: string | null;
  collisionWindow: number;
  collisionPolicy: "HIGHEST_PRIORITY_WINS" | "FIRST_QUEUED_WINS" | "SEND_ALL";
  createdAt: string;
  updatedAt: string;
  _count?: {
    singleSends: number;
  };
}

export interface CreateCampaignGroupDto {
  workspaceId: string;
  name: string;
  description?: string;
  collisionWindow?: number;
  collisionPolicy?: CampaignGroup["collisionPolicy"];
}

export const campaignGroups = {
  list: () => request<CampaignGroup[]>("/campaign-groups"),
  get: (id: string) => request<CampaignGroup>(`/campaign-groups/${id}`),
  create: (data: Omit<CreateCampaignGroupDto, "workspaceId">) =>
    request<CampaignGroup>("/campaign-groups", {
      method: "POST",
      body: { ...data, workspaceId: WORKSPACE_ID },
    }),
  update: (
    id: string,
    data: Partial<Omit<CreateCampaignGroupDto, "workspaceId">>,
  ) =>
    request<CampaignGroup>(`/campaign-groups/${id}`, {
      method: "PATCH",
      body: data,
    }),
  delete: (id: string) =>
    request<void>(`/campaign-groups/${id}`, { method: "DELETE" }),
};

// =============================================================================
// SEGMENTS
// =============================================================================

export interface Segment {
  id: string;
  name: string;
  description: string | null;
  sqlQuery: string;
  dataConnectorId: string;
  dataConnector?: DataConnector;
  createdAt: string;
  updatedAt: string;
  _count?: {
    singleSends: number;
  };
}

export interface CreateSegmentDto {
  workspaceId: string;
  name: string;
  description?: string;
  sqlQuery: string;
  dataConnectorId: string;
}

export const segments = {
  list: () => request<Segment[]>("/segments"),
  get: (id: string) => request<Segment>(`/segments/${id}`),
  create: (data: Omit<CreateSegmentDto, "workspaceId">) =>
    request<Segment>("/segments", {
      method: "POST",
      body: { ...data, workspaceId: WORKSPACE_ID },
    }),
  update: (id: string, data: Partial<Omit<CreateSegmentDto, "workspaceId">>) =>
    request<Segment>(`/segments/${id}`, { method: "PATCH", body: data }),
  delete: (id: string) =>
    request<void>(`/segments/${id}`, { method: "DELETE" }),
  dryRun: (id: string, limit = 10) =>
    request<{ count: number; sample: unknown[] }>(`/segments/${id}/dry-run`, {
      method: "POST",
      body: { limit },
    }),
};

// =============================================================================
// TEMPLATES
// =============================================================================

export interface Template {
  id: string;
  key: string;
  name: string;
  category: "MARKETING" | "TRANSACTIONAL" | "BOTH";
  createdAt: string;
  updatedAt: string;
  versions?: TemplateVersion[];
  _count?: {
    versions: number;
    singleSends: number;
  };
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  subject: string;
  preheader: string | null;
  bodyHtml: string | null;
  bodyMjml: string | null;
  builderSchema: unknown | null;
  mode: "RAW_HTML" | "RAW_MJML" | "UI_BUILDER";
  active: boolean;
  createdAt: string;
}

export interface CreateTemplateDto {
  workspaceId: string;
  key: string;
  name: string;
  category?: Template["category"];
}

export const templates = {
  list: () => request<Template[]>("/templates"),
  get: (id: string) => request<Template>(`/templates/${id}`),
  create: (data: Omit<CreateTemplateDto, "workspaceId">) =>
    request<Template>("/templates", {
      method: "POST",
      body: { ...data, workspaceId: WORKSPACE_ID },
    }),
  update: (id: string, data: Partial<Omit<CreateTemplateDto, "workspaceId">>) =>
    request<Template>(`/templates/${id}`, { method: "PATCH", body: data }),
  delete: (id: string) =>
    request<void>(`/templates/${id}`, { method: "DELETE" }),

  // Version operations
  createVersion: (
    templateId: string,
    data: Omit<TemplateVersion, "id" | "templateId" | "version" | "createdAt">,
  ) =>
    request<TemplateVersion>(`/templates/${templateId}/versions`, {
      method: "POST",
      body: data,
    }),
  activateVersion: (templateId: string, versionId: string) =>
    request<TemplateVersion>(
      `/templates/${templateId}/versions/${versionId}/activate`,
      { method: "POST", body: {} },
    ),
};

// =============================================================================
// COMPONENTS
// =============================================================================

export interface Component {
  id: string;
  name: string;
  description: string | null;
  type: "HEADER" | "FOOTER" | "BUTTON" | "CARD" | "DIVIDER" | "SNIPPET";
  contentType: "MJML" | "HTML";
  content: string;
  variables: Array<{
    name: string;
    type: string;
    defaultValue?: string;
    description?: string;
  }>;
  previewHtml: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateComponentDto {
  workspaceId: string;
  name: string;
  description?: string;
  type: Component["type"];
  contentType?: Component["contentType"];
  content: string;
  variables?: Component["variables"];
}

export const components = {
  list: () => request<Component[]>("/components"),
  get: (id: string) => request<Component>(`/components/${id}`),
  create: (data: Omit<CreateComponentDto, "workspaceId">) =>
    request<Component>("/components", {
      method: "POST",
      body: { ...data, workspaceId: WORKSPACE_ID },
    }),
  update: (
    id: string,
    data: Partial<Omit<CreateComponentDto, "workspaceId">>,
  ) => request<Component>(`/components/${id}`, { method: "PATCH", body: data }),
  delete: (id: string) =>
    request<void>(`/components/${id}`, { method: "DELETE" }),
};

// =============================================================================
// DATA CONNECTORS
// =============================================================================

export interface DataConnector {
  id: string;
  name: string;
  type: "POSTGRES" | "BIGQUERY";
  config: Record<string, unknown>; // Encrypted, only returned partially
  createdAt: string;
  updatedAt: string;
  _count?: {
    segments: number;
  };
}

export interface CreateDataConnectorDto {
  workspaceId: string;
  name: string;
  type: DataConnector["type"];
  config: Record<string, unknown>;
}

export const dataConnectors = {
  list: () => request<DataConnector[]>("/data-connectors"),
  get: (id: string, includeConfig = false) =>
    request<DataConnector>(`/data-connectors/${id}`, {
      params: { includeConfig: includeConfig ? "true" : undefined },
    }),
  create: (data: Omit<CreateDataConnectorDto, "workspaceId">) =>
    request<DataConnector>("/data-connectors", {
      method: "POST",
      body: { ...data, workspaceId: WORKSPACE_ID },
    }),
  update: (
    id: string,
    data: Partial<Omit<CreateDataConnectorDto, "workspaceId">>,
  ) =>
    request<DataConnector>(`/data-connectors/${id}`, {
      method: "PATCH",
      body: data,
    }),
  delete: (id: string) =>
    request<void>(`/data-connectors/${id}`, { method: "DELETE" }),
  test: (id: string) =>
    request<{ success: boolean; error?: string }>(
      `/data-connectors/${id}/test`,
      { method: "POST", body: {} },
    ),
  testConnection: (data: {
    type: DataConnector["type"];
    config: Record<string, unknown>;
  }) =>
    request<{ ok: boolean }>("/data-connectors/test-connection", {
      method: "POST",
      body: data,
    }),
  getConfigField: (id: string, fieldKey: string) =>
    request<{ value: string | null }>(
      `/data-connectors/${id}/config/${fieldKey}`,
    ),
};

// =============================================================================
// EMAIL CONNECTORS
// =============================================================================

export interface EmailConnector {
  id: string;
  name: string;
  type: "SES" | "RESEND" | "SMTP";
  config: Record<string, unknown>; // Encrypted, only returned partially
  webhookToken: string | null; // Raw token for manual editing
  webhookUrl: string | null; // Full webhook URL for this provider (SES/Resend only)
  createdAt: string;
  updatedAt: string;
  _count?: {
    senderProfiles: number;
  };
}

export interface CreateEmailConnectorDto {
  workspaceId: string;
  name: string;
  type: EmailConnector["type"];
  config: Record<string, unknown>;
}

export const emailConnectors = {
  list: () => request<EmailConnector[]>("/email-connectors"),
  get: (id: string, includeConfig = false) =>
    request<EmailConnector>(`/email-connectors/${id}`, {
      params: { includeConfig: includeConfig ? "true" : undefined },
    }),
  create: (data: Omit<CreateEmailConnectorDto, "workspaceId">) =>
    request<EmailConnector>("/email-connectors", {
      method: "POST",
      body: { ...data, workspaceId: WORKSPACE_ID },
    }),
  update: (
    id: string,
    data: Partial<Omit<CreateEmailConnectorDto, "workspaceId">>,
  ) =>
    request<EmailConnector>(`/email-connectors/${id}`, {
      method: "PATCH",
      body: data,
    }),
  delete: (id: string) =>
    request<void>(`/email-connectors/${id}`, { method: "DELETE" }),
  test: (id: string) =>
    request<{ ok: boolean }>(`/email-connectors/${id}/test`, {
      method: "POST",
    }),
  testConnection: (data: {
    type: EmailConnector["type"];
    config: Record<string, unknown>;
  }) =>
    request<{ ok: boolean }>("/email-connectors/test-connection", {
      method: "POST",
      body: data,
    }),
  regenerateWebhookToken: (id: string) =>
    request<EmailConnector>(
      `/email-connectors/${id}/regenerate-webhook-token`,
      { method: "POST" },
    ),
  setWebhookToken: (id: string, token: string | null) =>
    request<EmailConnector>(`/email-connectors/${id}/webhook-token`, {
      method: "PATCH",
      body: { token },
    }),
  getConfigField: (id: string, fieldKey: string) =>
    request<{ value: string | null }>(
      `/email-connectors/${id}/config/${fieldKey}`,
    ),
};

// =============================================================================
// SENDER PROFILES
// =============================================================================

export interface SenderProfile {
  id: string;
  name: string | null;
  fromEmail: string;
  fromName: string | null;
  replyTo: string | null;
  emailProviderConnectorId: string;
  emailProviderConnector?: EmailConnector;
  createdAt: string;
  updatedAt: string;
  _count?: {
    singleSends: number;
  };
}

export interface CreateSenderProfileDto {
  workspaceId: string;
  emailProviderConnectorId: string;
  name?: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
}

export const senderProfiles = {
  list: () => request<SenderProfile[]>("/sender-profiles"),
  get: (id: string) => request<SenderProfile>(`/sender-profiles/${id}`),
  create: (data: Omit<CreateSenderProfileDto, "workspaceId">) =>
    request<SenderProfile>("/sender-profiles", {
      method: "POST",
      body: { ...data, workspaceId: WORKSPACE_ID },
    }),
  update: (
    id: string,
    data: Partial<Omit<CreateSenderProfileDto, "workspaceId">>,
  ) =>
    request<SenderProfile>(`/sender-profiles/${id}`, {
      method: "PATCH",
      body: data,
    }),
  delete: (id: string) =>
    request<void>(`/sender-profiles/${id}`, { method: "DELETE" }),
};

// =============================================================================
// SUPPRESSIONS
// =============================================================================

export interface Suppression {
  id: string;
  email: string;
  reason: "BOUNCE" | "COMPLAINT" | "UNSUBSCRIBE" | "MANUAL";
  createdAt: string;
}

export interface SuppressionListResponse {
  items: Suppression[];
  total: number;
  limit: number;
  offset: number;
}

export interface SuppressionStats {
  total: number;
  byReason: Array<{ reason: Suppression["reason"]; count: number }>;
}

export interface CreateSuppressionDto {
  email: string;
  reason: Suppression["reason"];
}

export interface BatchCheckSuppressionDto {
  emails: string[];
}

export interface BatchCheckResult {
  email: string;
  suppressed: boolean;
  reason: Suppression["reason"] | null;
}

export const suppressions = {
  list: (params?: {
    reason?: Suppression["reason"];
    search?: string;
    limit?: number;
    offset?: number;
  }) =>
    request<SuppressionListResponse>("/suppressions", {
      params: params as Record<string, string | number | undefined>,
    }),
  get: (id: string) => request<Suppression>(`/suppressions/${id}`),
  create: (data: CreateSuppressionDto) =>
    request<Suppression>("/suppressions", { method: "POST", body: data }),
  delete: (id: string) =>
    request<void>(`/suppressions/${id}`, { method: "DELETE" }),
  deleteByEmail: (email: string) =>
    request<void>(`/suppressions/by-email/${encodeURIComponent(email)}`, {
      method: "DELETE",
    }),
  batchCheck: (emails: string[]) =>
    request<BatchCheckResult[]>("/suppressions/check", {
      method: "POST",
      body: { emails },
    }),
  getStats: () => request<SuppressionStats>("/suppressions/stats"),
};

// =============================================================================
// DEMO TOOLS
// =============================================================================

export interface DemoSend {
  id: string;
  email: string;
  subjectId: string;
  status: "QUEUED" | "SENT" | "DELIVERED" | "BOUNCED" | "FAILED" | "COMPLAINT";
  campaignName: string;
  campaignId: string | null;
  createdAt: string;
  providerMessageId: string | null;
}

export interface DemoEventResult {
  ok: boolean;
  event: "delivery" | "bounce" | "complaint";
  sendId: string;
  email: string;
  newStatus: string;
  suppressionAdded?: boolean;
  bounceType?: "hard" | "soft";
}

export const demo = {
  isEnabled: () => request<{ enabled: boolean }>("/demo/enabled"),
  listRecentSends: (limit = 50) =>
    request<DemoSend[]>("/demo/sends", { params: { limit } }),
  simulateDelivery: (sendId: string) =>
    request<DemoEventResult>(`/demo/sends/${sendId}/deliver`, {
      method: "POST",
      body: {},
    }),
  simulateBounce: (sendId: string, bounceType: "hard" | "soft" = "hard") =>
    request<DemoEventResult>(`/demo/sends/${sendId}/bounce`, {
      method: "POST",
      body: { bounceType },
    }),
  simulateComplaint: (sendId: string) =>
    request<DemoEventResult>(`/demo/sends/${sendId}/complaint`, {
      method: "POST",
      body: {},
    }),
};

// =============================================================================
// API OBJECT EXPORT
// =============================================================================

export const api = {
  analytics,
  campaigns,
  campaignGroups,
  segments,
  templates,
  components,
  dataConnectors,
  emailConnectors,
  senderProfiles,
  suppressions,
  demo,
};

export default api;
