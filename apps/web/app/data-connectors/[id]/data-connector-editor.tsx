'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Database,
  ArrowLeft,
  Save,
  Trash2,
  AlertCircle,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Plug,
  X,
  FileCode,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { DataConnector } from '@/lib/api';

function defaultConfigFor(type: string): Record<string, unknown> {
  switch (type) {
    case 'POSTGRES':
      return { connectionString: 'postgresql://user:pass@host:5432/db' };
    case 'BIGQUERY':
      return { projectId: 'my-project', credentials: { client_email: '', private_key: '' } };
    default:
      return {};
  }
}

export default function DataConnectorEditor({
  dataConnectorId,
}: {
  dataConnectorId: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const [connector, setConnector] = useState<DataConnector | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<DataConnector['type']>('POSTGRES');
  const [configJson, setConfigJson] = useState('');

  const fetchConnector = useCallback(async () => {
    try {
      setError(null);
      const data = await api.dataConnectors.get(dataConnectorId);
      setConnector(data);
      setName(data.name);
      setType(data.type);
      // Config is redacted from API, show placeholder
      setConfigJson(JSON.stringify(defaultConfigFor(data.type), null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data connector');
    } finally {
      setIsLoading(false);
    }
  }, [dataConnectorId]);

  useEffect(() => {
    fetchConnector();
  }, [fetchConnector]);

  const insertTemplate = () => {
    setConfigJson(JSON.stringify(defaultConfigFor(type), null, 2));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      let config: Record<string, unknown> | undefined;
      if (configJson?.trim()) {
        try {
          config = JSON.parse(configJson);
        } catch {
          throw new Error('Invalid JSON in config');
        }
      }

      const updated = await api.dataConnectors.update(dataConnectorId, {
        name,
        type,
        config,
      });
      setConnector(updated);
      setSuccessMessage('Data connector updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update data connector');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsTesting(true);

    try {
      let config: Record<string, unknown>;
      try {
        config = JSON.parse(configJson || '{}');
      } catch {
        throw new Error('Invalid JSON in config');
      }

      await api.dataConnectors.testConnection({ type, config });
      setSuccessMessage('Connection successful!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this data connector? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.dataConnectors.delete(dataConnectorId);
      router.push('/data-connectors');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete data connector');
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
          <h3 className="empty-state-title">Data connector not found</h3>
          <p className="empty-state-description">
            The data connector you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <Link href="/data-connectors" className="btn btn-primary">
            <ArrowLeft className="w-4 h-4" />
            Back to Connectors
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/data-connectors" className="btn btn-ghost p-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-emerald-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {connector.name}
            </h1>
            <p className="text-sm text-[var(--text-muted)] font-mono">
              {connector.type}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchConnector}
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
                Connection Settings
              </h2>
              <button
                type="button"
                onClick={insertTemplate}
                className="btn btn-ghost text-sm"
              >
                <FileCode className="w-4 h-4" />
                Insert Template
              </button>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="label">Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Production Database"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select
                    className="select"
                    value={type}
                    onChange={(e) => setType(e.target.value as DataConnector['type'])}
                    disabled={isSaving}
                  >
                    <option value="POSTGRES">PostgreSQL</option>
                    <option value="BIGQUERY">BigQuery</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Configuration (JSON)</label>
                <textarea
                  className="textarea font-mono text-sm"
                  rows={10}
                  placeholder='{"connectionString": "postgresql://..."}'
                  value={configJson}
                  onChange={(e) => setConfigJson(e.target.value)}
                  disabled={isSaving}
                />
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Stored secrets are never returned by the API. Paste credentials again to update.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-[var(--border-default)]">
              <Link href="/data-connectors" className="btn btn-secondary">
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
              Connection Info
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-[var(--text-muted)]">ID</span>
                <p className="text-sm text-[var(--text-secondary)] font-mono break-all">
                  {connector.id}
                </p>
              </div>
              <div>
                <span className="text-xs text-[var(--text-muted)]">Type</span>
                <p className="text-sm text-[var(--text-primary)]">
                  {connector.type === 'POSTGRES' ? 'PostgreSQL' : 'BigQuery'}
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
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-[var(--text-primary)] mb-1">
                  Configuration Help
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  {type === 'POSTGRES' ? (
                    <>Use a connection string format: <code className="text-emerald-400">postgresql://user:pass@host:5432/db</code></>
                  ) : (
                    <>Provide your GCP project ID and service account credentials JSON.</>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Security Note */}
          <div className="card-glow">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-[var(--text-primary)] mb-1">
                  Security Note
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  Credentials are encrypted at rest and never exposed via the API.
                  Use read-only database credentials for added safety.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
