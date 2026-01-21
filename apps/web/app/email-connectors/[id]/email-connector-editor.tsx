"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  ArrowLeft,
  Save,
  Trash2,
  AlertCircle,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Plug,
  Link as LinkIcon,
  Copy,
  Check,
  RotateCcw,
  Pencil,
  Plus,
} from "lucide-react";
import { api } from "@/lib/api";
import type { EmailConnector } from "@/lib/api";
import { useToast } from "@/components/toast";
import SecretField from "@/components/SecretField";

function getTypeLabel(type: string): string {
  switch (type) {
    case "SES":
      return "Amazon SES";
    case "RESEND":
      return "Resend";
    case "SMTP":
      return "SMTP";
    default:
      return type;
  }
}

// Config field definitions for each provider type
interface ConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "number";
  placeholder: string;
  required?: boolean;
}

const configFieldsByType: Record<string, ConfigField[]> = {
  SES: [
    {
      key: "region",
      label: "AWS Region",
      type: "text",
      placeholder: "us-east-1",
      required: true,
    },
    {
      key: "accessKeyId",
      label: "Access Key ID",
      type: "text",
      placeholder: "AKIA...",
      required: true,
    },
    {
      key: "secretAccessKey",
      label: "Secret Access Key",
      type: "password",
      placeholder: "Your secret key",
      required: true,
    },
  ],
  RESEND: [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "re_...",
      required: true,
    },
  ],
  SMTP: [
    {
      key: "host",
      label: "Host",
      type: "text",
      placeholder: "smtp.example.com",
      required: true,
    },
    {
      key: "port",
      label: "Port",
      type: "number",
      placeholder: "587",
      required: true,
    },
    {
      key: "user",
      label: "Username",
      type: "text",
      placeholder: "user@example.com",
      required: true,
    },
    {
      key: "pass",
      label: "Password",
      type: "password",
      placeholder: "Your password",
      required: true,
    },
    {
      key: "secure",
      label: "Use TLS",
      type: "text",
      placeholder: "true or false",
    },
  ],
};

export default function EmailConnectorEditor({
  emailConnectorId,
}: {
  emailConnectorId: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [connector, setConnector] = useState<EmailConnector | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<EmailConnector["type"]>("SES");
  const [configValues, setConfigValues] = useState<Record<string, string>>({});

  // Webhook state
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [isRegeneratingWebhook, setIsRegeneratingWebhook] = useState(false);
  const [isEditingWebhook, setIsEditingWebhook] = useState(false);
  const [webhookTokenInput, setWebhookTokenInput] = useState("");
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);

  const fetchConnector = useCallback(async () => {
    try {
      // Fetch with config to populate non-secret fields (region, accessKeyId, etc.)
      const data = await api.emailConnectors.get(emailConnectorId, true);
      setConnector(data);
      setName(data.name);
      setType(data.type);

      // Populate non-secret config values from the fetched config
      if (data.config && !("redacted" in data.config)) {
        const fields = configFieldsByType[data.type] || [];
        const values: Record<string, string> = {};
        for (const field of fields) {
          // Only auto-populate non-secret fields
          if (field.type !== "password") {
            const val = data.config[field.key];
            if (val !== undefined && val !== null) {
              values[field.key] = String(val);
            }
          }
        }
        setConfigValues((prev) => ({ ...prev, ...values }));
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to fetch email connector",
      );
    } finally {
      setIsLoading(false);
    }
  }, [emailConnectorId, toast]);

  useEffect(() => {
    fetchConnector();
  }, [fetchConnector]);

  // Per-field credential reveal
  const handleRevealField = useCallback(
    async (fieldKey: string): Promise<string | null> => {
      try {
        const result = await api.emailConnectors.getConfigField(
          emailConnectorId,
          fieldKey,
        );
        return result.value;
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : `Failed to reveal ${fieldKey}`,
        );
        return null;
      }
    },
    [emailConnectorId, toast],
  );

  const handleConfigChange = (key: string, value: string) => {
    setConfigValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Build config object from form values
      const config: Record<string, unknown> = {};
      const fields = configFieldsByType[type] || [];

      for (const field of fields) {
        const value = configValues[field.key];
        if (value !== undefined && value !== "") {
          config[field.key] = field.type === "number" ? Number(value) : value;
        }
      }

      const updated = await api.emailConnectors.update(emailConnectorId, {
        name,
        type,
        config: Object.keys(config).length > 0 ? config : undefined,
      });
      setConnector(updated);
      toast.success("Email connector updated successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update email connector",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);

    try {
      // Build config object from form values
      const config: Record<string, unknown> = {};
      const fields = configFieldsByType[type] || [];

      for (const field of fields) {
        const value = configValues[field.key];
        if (value !== undefined && value !== "") {
          config[field.key] = field.type === "number" ? Number(value) : value;
        }
      }

      await api.emailConnectors.testConnection({ type, config });
      toast.success("Connection successful!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Connection test failed",
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this email connector? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.emailConnectors.delete(emailConnectorId);
      toast.success("Email connector deleted");
      router.push("/email-connectors");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete email connector",
      );
      setIsDeleting(false);
    }
  };

  // Get the full webhook URL using NEXT_PUBLIC_API_URL
  const getFullWebhookUrl = () => {
    if (!connector?.webhookToken) return null;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    // Ensure no double slash if baseUrl ends with /
    const cleanBaseUrl = baseUrl.replace(/\/$/, "");
    const providerPath = connector.type.toLowerCase();

    return `${cleanBaseUrl}/webhooks/${providerPath}/${connector.webhookToken}`;
  };

  const copyWebhookUrl = async () => {
    const fullUrl = getFullWebhookUrl();
    if (!fullUrl) return;
    await navigator.clipboard.writeText(fullUrl);
    setWebhookCopied(true);
    setTimeout(() => setWebhookCopied(false), 2000);
  };

  const handleSaveWebhookToken = async () => {
    setIsSavingWebhook(true);
    try {
      const updated = await api.emailConnectors.setWebhookToken(
        emailConnectorId,
        webhookTokenInput.trim() || null,
      );
      setConnector(updated);
      setIsEditingWebhook(false);
      setWebhookTokenInput("");
      toast.success("Webhook token updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update webhook token",
      );
    } finally {
      setIsSavingWebhook(false);
    }
  };

  const startEditingWebhook = () => {
    setWebhookTokenInput(connector?.webhookToken || "");
    setIsEditingWebhook(true);
  };

  const handleRegenerateWebhook = async () => {
    if (
      connector?.webhookToken &&
      !confirm(
        "Are you sure you want to regenerate the webhook token? You will need to update your SNS subscription with the new URL.",
      )
    ) {
      return;
    }

    setIsRegeneratingWebhook(true);
    try {
      const updated =
        await api.emailConnectors.regenerateWebhookToken(emailConnectorId);
      setConnector(updated);
      toast.success(
        connector?.webhookToken
          ? "Webhook token regenerated"
          : "Webhook token generated",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate webhook token",
      );
    } finally {
      setIsRegeneratingWebhook(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <div
            className="skeleton"
            style={{ height: "40px", width: "40px", borderRadius: "8px" }}
          />
          <div>
            <div
              className="skeleton"
              style={{ height: "28px", width: "200px", marginBottom: "8px" }}
            />
            <div
              className="skeleton"
              style={{ height: "16px", width: "300px" }}
            />
          </div>
        </div>
        <div
          className="skeleton"
          style={{ height: "400px", borderRadius: "16px" }}
        />
      </div>
    );
  }

  if (!connector) {
    return (
      <div className="card">
        <div className="empty-state">
          <AlertCircle className="empty-state-icon text-rose-400" />
          <h3 className="empty-state-title">Email connector not found</h3>
          <p className="empty-state-description">
            The email connector you&apos;re looking for doesn&apos;t exist or
            has been deleted.
          </p>
          <Link href="/email-connectors" className="btn btn-primary">
            <ArrowLeft className="w-4 h-4" />
            Back to Connectors
          </Link>
        </div>
      </div>
    );
  }

  const fields = configFieldsByType[type] || [];

  return (
    <div className="animate-slide-up flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/email-connectors" className="btn btn-ghost p-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center text-violet-400">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {connector.name}
            </h1>
            <p className="text-sm text-faint font-mono">
              {getTypeLabel(connector.type)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchConnector()}
            className="btn btn-secondary"
            disabled={isSaving || isTesting}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleTestConnection}
            className="btn btn-secondary"
            disabled={isSaving || isTesting}
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plug className="w-4 h-4" />
            )}
            Test
          </button>
          <button
            onClick={handleDelete}
            className="btn btn-secondary text-rose-400 hover:bg-rose-500/10"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="card-glow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                Provider Settings
              </h2>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Production SES"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="label">Provider</label>
                  <select
                    className="select"
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value as EmailConnector["type"]);
                      setConfigValues({});
                    }}
                    disabled={isSaving}
                  >
                    <option value="SES">Amazon SES</option>
                    <option value="RESEND">Resend</option>
                    <option value="SMTP">SMTP</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-border-default pt-5">
                <h3 className="text-sm font-medium text-foreground mb-4">
                  {getTypeLabel(type)} Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fields.map((field) =>
                    field.type === "password" ? (
                      <SecretField
                        key={field.key}
                        label={field.label}
                        fieldKey={field.key}
                        value={configValues[field.key] || ""}
                        placeholder={field.placeholder}
                        required={field.required}
                        disabled={isSaving}
                        fullWidth={
                          field.key === "secretAccessKey" ||
                          field.key === "apiKey"
                        }
                        hasStoredValue={!!connector?.id}
                        onReveal={handleRevealField}
                        onChange={(value) =>
                          handleConfigChange(field.key, value)
                        }
                      />
                    ) : (
                      <div key={field.key}>
                        <label className="label">
                          {field.label}
                          {field.required && (
                            <span className="text-rose-400 ml-1">*</span>
                          )}
                        </label>
                        <input
                          type={field.type === "number" ? "number" : "text"}
                          className="input font-mono"
                          placeholder={field.placeholder}
                          value={configValues[field.key] || ""}
                          onChange={(e) =>
                            handleConfigChange(field.key, e.target.value)
                          }
                          required={field.required}
                          disabled={isSaving}
                        />
                      </div>
                    ),
                  )}
                </div>
              </div>

              <p className="text-xs text-faint">
                Click the eye icon on each secret field to reveal its stored
                value, or enter new values to update.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-border-default">
              <Link href="/email-connectors" className="btn btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info Card */}
          <div className="card-glow">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Connector Info
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-faint">ID</span>
                <p className="text-sm text-muted-foreground font-mono break-all">
                  {connector.id}
                </p>
              </div>
              <div>
                <span className="text-xs text-faint">Provider</span>
                <p className="text-sm text-foreground">
                  {getTypeLabel(connector.type)}
                </p>
              </div>
              <div>
                <span className="text-xs text-faint">Created</span>
                <p className="text-sm text-muted-foreground">
                  {new Date(connector.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Webhook Configuration Card - Only for SES/Resend */}
          {(connector.type === "SES" || connector.type === "RESEND") && (
            <div className="card-glow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Webhook Configuration
                </h3>
                <LinkIcon className="w-5 h-5 text-faint" />
              </div>

              {isEditingWebhook ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-faint">Webhook Token</label>
                    <input
                      type="text"
                      className="input mt-1 font-mono text-sm"
                      placeholder="Enter custom token or leave empty to remove"
                      value={webhookTokenInput}
                      onChange={(e) => setWebhookTokenInput(e.target.value)}
                      disabled={isSavingWebhook}
                    />
                    <p className="text-xs text-faint mt-1">
                      8-64 characters: letters, numbers, underscores, hyphens
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveWebhookToken}
                      className="btn btn-primary flex-1 text-sm"
                      disabled={isSavingWebhook}
                    >
                      {isSavingWebhook ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingWebhook(false)}
                      className="btn btn-secondary text-sm"
                      disabled={isSavingWebhook}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : connector.webhookToken ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-faint">Webhook URL</span>
                    <div className="mt-1 p-3 bg-muted rounded-lg">
                      <code className="text-xs text-muted-foreground break-all">
                        {getFullWebhookUrl()}
                      </code>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-faint">Token</span>
                    <div className="mt-1 p-2 bg-muted rounded-lg">
                      <code className="text-xs text-muted-foreground font-mono">
                        {connector.webhookToken}
                      </code>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={copyWebhookUrl}
                      className="btn btn-secondary flex-1 text-sm"
                    >
                      {webhookCopied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy URL
                        </>
                      )}
                    </button>
                    <button
                      onClick={startEditingWebhook}
                      className="btn btn-secondary text-sm"
                      title="Edit webhook token"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleRegenerateWebhook}
                      className="btn btn-secondary text-sm"
                      disabled={isRegeneratingWebhook}
                      title="Regenerate webhook token"
                    >
                      {isRegeneratingWebhook ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-faint">
                    {connector.type === "SES" ? (
                      <>
                        Configure this URL as an HTTPS endpoint subscription in
                        your AWS SNS topic.
                      </>
                    ) : (
                      <>Configure this URL in your Resend webhook settings.</>
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-faint">
                    No webhook token configured. Generate one or set a custom
                    token.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRegenerateWebhook}
                      className="btn btn-primary flex-1 text-sm"
                      disabled={isRegeneratingWebhook}
                    >
                      {isRegeneratingWebhook ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      Generate Token
                    </button>
                    <button
                      onClick={startEditingWebhook}
                      className="btn btn-secondary text-sm"
                      title="Set custom token"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Help Card */}
          <div className="card-glow">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 flex-shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">
                  Configuration Help
                </h4>
                <p className="text-xs text-muted-foreground">
                  {type === "SES" && (
                    <>
                      Requires AWS region, accessKeyId, and secretAccessKey with
                      SES permissions.
                    </>
                  )}
                  {type === "RESEND" && (
                    <>Provide your Resend API key from the dashboard.</>
                  )}
                  {type === "SMTP" && (
                    <>
                      Configure host, port, user, and password for your SMTP
                      server.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Security Note */}
          <div className="card-glow">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">
                  Self-Hosted
                </h4>
                <p className="text-xs text-muted-foreground">
                  Credentials are encrypted at rest. You can view stored values
                  since this is a self-hosted instance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
