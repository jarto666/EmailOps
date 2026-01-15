'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Database,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plug,
  Server,
} from 'lucide-react';

// Mock data
const mockConnectors = [
  {
    id: '1',
    name: 'Production Database',
    type: 'POSTGRES',
    status: 'connected',
    lastChecked: '2024-01-14T10:30:00Z',
    segmentsCount: 5,
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    name: 'Analytics Warehouse',
    type: 'BIGQUERY',
    status: 'connected',
    lastChecked: '2024-01-14T10:25:00Z',
    segmentsCount: 3,
    createdAt: '2024-01-05',
  },
  {
    id: '3',
    name: 'Staging DB',
    type: 'POSTGRES',
    status: 'error',
    lastChecked: '2024-01-14T09:00:00Z',
    segmentsCount: 0,
    error: 'Connection timeout',
    createdAt: '2024-01-10',
  },
];

function ConnectorTypeBadge({ type }: { type: string }) {
  const styles = {
    POSTGRES: { class: 'badge-primary', icon: '🐘' },
    BIGQUERY: { class: 'badge-warning', icon: '📊' },
  };

  const style = styles[type as keyof typeof styles] || { class: 'badge-default', icon: '📁' };

  return (
    <span className={`badge ${style.class}`}>
      <span className="mr-1">{style.icon}</span>
      {type}
    </span>
  );
}

function StatusIndicator({ status, error }: { status: string; error?: string }) {
  if (status === 'connected') {
    return (
      <div className="flex items-center gap-2 text-emerald-400">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-sm">Connected</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-rose-400">
      <div className="w-2 h-2 rounded-full bg-rose-400" />
      <span className="text-sm" title={error}>Error</span>
    </div>
  );
}

const postgresConfig = {
  connectionString: 'postgresql://user:password@host:5432/database',
};

const bigqueryConfig = {
  projectId: 'your-project-id',
  credentials: {
    client_email: 'service-account@project.iam.gserviceaccount.com',
    private_key: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
  },
};

function CreateConnectorModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [type, setType] = useState<'POSTGRES' | 'BIGQUERY'>('POSTGRES');
  const [config, setConfig] = useState(JSON.stringify(postgresConfig, null, 2));
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const handleTypeChange = (newType: 'POSTGRES' | 'BIGQUERY') => {
    setType(newType);
    setConfig(JSON.stringify(newType === 'POSTGRES' ? postgresConfig : bigqueryConfig, null, 2));
    setTestResult(null);
  };

  const handleTest = () => {
    setTesting(true);
    setTimeout(() => {
      setTestResult({ success: true });
      setTesting(false);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Add Data Connector</h2>
          <button onClick={onClose} className="btn btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form className="space-y-5">
          <div className="form-grid">
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., Production Database"
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select
                className="select"
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as 'POSTGRES' | 'BIGQUERY')}
              >
                <option value="POSTGRES">PostgreSQL</option>
                <option value="BIGQUERY">BigQuery</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Configuration (JSON)</label>
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="btn btn-ghost text-sm py-1.5"
              >
                {testing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plug className="w-4 h-4" />
                )}
                Test Connection
              </button>
            </div>
            <textarea
              className="textarea font-mono text-sm h-56"
              value={config}
              onChange={(e) => setConfig(e.target.value)}
              spellCheck={false}
            />
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Configuration is encrypted at rest and never exposed via API
            </p>
          </div>

          {testResult && (
            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              testResult.success
                ? 'bg-emerald-500/10 border border-emerald-500/20'
                : 'bg-rose-500/10 border border-rose-500/20'
            }`}>
              {testResult.success ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Connection successful</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                  <span className="text-rose-400">{testResult.error}</span>
                </>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Connector
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DataConnectorsPageClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredConnectors = mockConnectors.filter(
    (c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <div className="skeleton" style={{ height: '32px', width: '192px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ height: '16px', width: '288px' }} />
        </div>
        <div className="cards-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: '192px', borderRadius: '16px' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex-between mb-lg">
        <div>
          <h1 className="page-title">Data Connectors</h1>
          <p className="page-description">
            Connect to your databases for SQL-based segmentation
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Add Connector
        </button>
      </div>

      {/* Info Card */}
      <div className="card-glow mb-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium text-[var(--text-primary)] mb-1">
              Zero-ETL Architecture
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Query your production or analytics databases directly. No data copying,
              no sync jobs, no stale data. Your segments always reflect real-time state.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="search-container">
        <Search className="search-icon" style={{ width: '20px', height: '20px' }} />
        <input
          type="text"
          placeholder="Search connectors..."
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Connectors Grid */}
      {filteredConnectors.length > 0 ? (
        <div className="cards-grid">
          {filteredConnectors.map((connector) => (
            <div key={connector.id} className="card-glow group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-emerald-400">
                  <Database className="w-6 h-6" />
                </div>
                <div className="relative">
                  <button className="btn btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <Link href={`/data-connectors/${connector.id}`} className="block mb-3">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] hover:text-indigo-400 transition-colors">
                  {connector.name}
                </h3>
              </Link>

              <div className="flex items-center gap-3 mb-4">
                <ConnectorTypeBadge type={connector.type} />
                <StatusIndicator status={connector.status} error={connector.error} />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border-default)]">
                <div className="text-sm text-[var(--text-muted)]">
                  {connector.segmentsCount} segments
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="btn btn-ghost p-2">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button className="btn btn-ghost p-2">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button className="btn btn-ghost p-2 text-rose-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <Database className="empty-state-icon" />
            <h3 className="empty-state-title">No connectors found</h3>
            <p className="empty-state-description">
              {searchQuery
                ? 'No connectors match your search'
                : 'Add your first data connector to start querying'}
            </p>
            {!searchQuery && (
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Add Connector
              </button>
            )}
          </div>
        </div>
      )}

      <CreateConnectorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
