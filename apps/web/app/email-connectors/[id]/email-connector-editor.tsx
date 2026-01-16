'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { EmailConnector } from '@/lib/api';

function getTypeLabel(type: string): string {
  switch (type) {
    case 'SES':
      return 'Amazon SES';
    case 'RESEND':
      return 'Resend';
    case 'SMTP':
      return 'SMTP';
    default:
      return type;
  }
}

// Config field definitions for each provider type
interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number';
  placeholder: string;
  required?: boolean;
}

const configFieldsByType: Record<string, ConfigField[]> = {
  SES: [
    { key: 'region', label: 'AWS Region', type: 'text', placeholder: 'us-east-1', required: true },
    { key: 'accessKeyId', label: 'Access Key ID', type: 'text', placeholder: 'AKIA...', required: true },
    { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', placeholder: 'Your secret key', required: true },
  ],
  RESEND: [
    { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 're_...', required: true },
  ],
  SMTP: [
    { key: 'host', label: 'Host', type: 'text', placeholder: 'smtp.example.com', required: true },
    { key: 'port', label: 'Port', type: 'number', placeholder: '587', required: true },
    { key: 'user', label: 'Username', type: 'text', placeholder: 'user@example.com', required: true },
    { key: 'pass', label: 'Password', type: 'password', placeholder: 'Your password', required: true },
    { key: 'secure', label: 'Use TLS', type: 'text', placeholder: 'true or false' },
  ],
};

export default function EmailConnectorEditor({
  emailConnectorId,
}: {
  emailConnectorId: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const [connector, setConnector] = useState<EmailConnector | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<EmailConnector['type']>('SES');
  const [configValues, setConfigValues] = useState<Record<string, string>>({});

  const fetchConnector = useCallback(async (includeConfig = false) => {
    try {
      setError(null);
      const data = await api.emailConnectors.get(emailConnectorId, includeConfig);
      setConnector(data);
      setName(data.name);
      setType(data.type);

      // If config is included (not redacted), populate the form fields
      if (data.config && !('redacted' in data.config)) {
        const values: Record<string, string> = {};
        Object.entries(data.config).forEach(([key, value]) => {
          values[key] = String(value ?? '');
        });
        setConfigValues(values);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch email connector');
    } finally {
      setIsLoading(false);
    }
  }, [emailConnectorId]);

  useEffect(() => {
    // Initially load without config, user can toggle to show secrets
    fetchConnector(false);
  }, [fetchConnector]);

  const handleShowSecrets = async () => {
    if (!showSecrets) {
      // Fetch with config when showing secrets
      setIsLoading(true);
      await fetchConnector(true);
      setShowSecrets(true);
      setIsLoading(false);
    } else {
      setShowSecrets(false);
    }
  };

  const handleConfigChange = (key: string, value: string) => {
    setConfigValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      // Build config object from form values
      const config: Record<string, unknown> = {};
      const fields = configFieldsByType[type] || [];

      for (const field of fields) {
        const value = configValues[field.key];
        if (value !== undefined && value !== '') {
          config[field.key] = field.type === 'number' ? Number(value) : value;
        }
      }

      const updated = await api.emailConnectors.update(emailConnectorId, {
        name,
        type,
        config: Object.keys(config).length > 0 ? config : undefined,
      });
      setConnector(updated);
      setSuccessMessage('Email connector updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update email connector');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsTesting(true);

    try {
      // Build config object from form values
      const config: Record<string, unknown> = {};
      const fields = configFieldsByType[type] || [];

      for (const field of fields) {
        const value = configValues[field.key];
        if (value !== undefined && value !== '') {
          config[field.key] = field.type === 'number' ? Number(value) : value;
        }
      }

      await api.emailConnectors.testConnection({ type, config });
      setSuccessMessage('Connection successful!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this email connector? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.emailConnectors.delete(emailConnectorId);
      router.push('/email-connectors');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete email connector');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <div className="skeleton" style={{ height: '40px', width: '40px', borderRadius: '8px' }} />
          <div>
            <div className="skeleton" style={{ height: '28px', width: '200px', marginBottom: '8px' }} />
            <div className="skeleton" style={{ height: '16px', width: '300px' }} />
          </div>
        </div>
        <div className="skeleton" style={{ height: '400px', borderRadius: '16px' }} />
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
            The email connector you&apos;re looking for doesn&apos;t exist or has been deleted.
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
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/email-connectors" className="btn btn-ghost p-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center text-violet-400">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {connector.name}
            </h1>
            <p className="text-sm text-[var(--text-muted)] font-mono">
              {getTypeLabel(connector.type)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchConnector(showSecrets)}
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

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-rose-500/10 border border-rose-500/20">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span className="text-rose-400 whitespace-pre-wrap">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto btn btn-ghost p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-emerald-400">{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="card-glow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Provider Settings
              </h2>
              <button
                type="button"
                onClick={handleShowSecrets}
                className="btn btn-ghost text-sm"
              >
                {showSecrets ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Hide Credentials
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Show Credentials
                  </>
                )}
              </button>
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
                      setType(e.target.value as EmailConnector['type']);
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

              <div className="border-t border-[var(--border-default)] pt-5">
                <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">
                  {getTypeLabel(type)} Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fields.map((field) => (
                    <div key={field.key} className={field.key === 'secretAccessKey' || field.key === 'apiKey' ? 'md:col-span-2' : ''}>
                      <label className="label">
                        {field.label}
                        {field.required && <span className="text-rose-400 ml-1">*</span>}
                      </label>
                      <input
                        type={field.type === 'password' && !showSecrets ? 'password' : field.type === 'number' ? 'number' : 'text'}
                        className="input font-mono"
                        placeholder={field.placeholder}
                        value={configValues[field.key] || ''}
                        onChange={(e) => handleConfigChange(field.key, e.target.value)}
                        required={field.required}
                        disabled={isSaving}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {!showSecrets && (
                <p className="text-xs text-[var(--text-muted)]">
                  Click &quot;Show Credentials&quot; to view and edit stored values, or enter new values to update.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-[var(--border-default)]">
              <Link href="/email-connectors" className="btn btn-secondary">
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
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
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Connector Info
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-[var(--text-muted)]">ID</span>
                <p className="text-sm text-[var(--text-secondary)] font-mono break-all">
                  {connector.id}
                </p>
              </div>
              <div>
                <span className="text-xs text-[var(--text-muted)]">Provider</span>
                <p className="text-sm text-[var(--text-primary)]">
                  {getTypeLabel(connector.type)}
                </p>
              </div>
              <div>
                <span className="text-xs text-[var(--text-muted)]">Created</span>
                <p className="text-sm text-[var(--text-secondary)]">
                  {new Date(connector.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Help Card */}
          <div className="card-glow">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 flex-shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-[var(--text-primary)] mb-1">
                  Configuration Help
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  {type === 'SES' && (
                    <>Requires AWS region, accessKeyId, and secretAccessKey with SES permissions.</>
                  )}
                  {type === 'RESEND' && (
                    <>Provide your Resend API key from the dashboard.</>
                  )}
                  {type === 'SMTP' && (
                    <>Configure host, port, user, and password for your SMTP server.</>
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
                <h4 className="font-medium text-[var(--text-primary)] mb-1">
                  Self-Hosted
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  Credentials are encrypted at rest. You can view stored values since this is a self-hosted instance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
