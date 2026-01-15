'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Mail,
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
  Send,
  Shield,
} from 'lucide-react';

// Mock data
const mockConnectors = [
  {
    id: '1',
    name: 'AWS SES Production',
    type: 'SES',
    status: 'connected',
    region: 'us-east-1',
    lastChecked: '2024-01-14T10:30:00Z',
    profilesCount: 3,
    totalSent: 125430,
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    name: 'Resend Transactional',
    type: 'RESEND',
    status: 'connected',
    lastChecked: '2024-01-14T10:25:00Z',
    profilesCount: 2,
    totalSent: 45230,
    createdAt: '2024-01-05',
  },
  {
    id: '3',
    name: 'SMTP Backup',
    type: 'SMTP',
    status: 'error',
    host: 'smtp.example.com',
    lastChecked: '2024-01-14T09:00:00Z',
    profilesCount: 0,
    totalSent: 0,
    error: 'Authentication failed',
    createdAt: '2024-01-10',
  },
];

function ConnectorTypeBadge({ type }: { type: string }) {
  const styles = {
    SES: { class: 'badge-warning', label: 'AWS SES' },
    RESEND: { class: 'badge-primary', label: 'Resend' },
    SMTP: { class: 'badge-default', label: 'SMTP' },
  };

  const style = styles[type as keyof typeof styles] || { class: 'badge-default', label: type };

  return <span className={`badge ${style.class}`}>{style.label}</span>;
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

const sesConfig = {
  region: 'us-east-1',
  accessKeyId: 'AKIA...',
  secretAccessKey: '...',
};

const resendConfig = {
  apiKey: 're_...',
};

const smtpConfig = {
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  auth: {
    user: 'user@example.com',
    pass: '...',
  },
};

function CreateConnectorModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [type, setType] = useState<'SES' | 'RESEND' | 'SMTP'>('SES');
  const [config, setConfig] = useState(JSON.stringify(sesConfig, null, 2));
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const handleTypeChange = (newType: 'SES' | 'RESEND' | 'SMTP') => {
    setType(newType);
    const configs = { SES: sesConfig, RESEND: resendConfig, SMTP: smtpConfig };
    setConfig(JSON.stringify(configs[newType], null, 2));
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
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Add Email Provider</h2>
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
                placeholder="e.g., AWS SES Production"
              />
            </div>
            <div>
              <label className="label">Provider Type</label>
              <select
                className="select"
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as 'SES' | 'RESEND' | 'SMTP')}
              >
                <option value="SES">AWS SES</option>
                <option value="RESEND">Resend</option>
                <option value="SMTP">SMTP</option>
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
              className="textarea font-mono text-sm h-48"
              value={config}
              onChange={(e) => setConfig(e.target.value)}
              spellCheck={false}
            />
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Credentials are encrypted at rest and never exposed via API
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
              Add Provider
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmailConnectorsPageClient() {
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
          <h1 className="page-title">Email Providers</h1>
          <p className="page-description">
            Configure email sending infrastructure
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Add Provider
        </button>
      </div>

      {/* Info Card */}
      <div className="card-glow mb-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium text-[var(--text-primary)] mb-1">
              Bring Your Own Infrastructure
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Connect your AWS SES, Resend, or SMTP servers. Your emails, your reputation,
              your deliverability. Credentials are encrypted and never leave your infrastructure.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="search-container">
        <Search className="search-icon" style={{ width: '20px', height: '20px' }} />
        <input
          type="text"
          placeholder="Search providers..."
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
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-amber-400">
                  <Mail className="w-6 h-6" />
                </div>
                <div className="relative">
                  <button className="btn btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <Link href={`/email-connectors/${connector.id}`} className="block mb-3">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] hover:text-indigo-400 transition-colors">
                  {connector.name}
                </h3>
                {connector.region && (
                  <p className="text-sm text-[var(--text-muted)] mt-0.5">
                    Region: {connector.region}
                  </p>
                )}
                {connector.host && (
                  <p className="text-sm text-[var(--text-muted)] mt-0.5">
                    Host: {connector.host}
                  </p>
                )}
              </Link>

              <div className="flex items-center gap-3 mb-4">
                <ConnectorTypeBadge type={connector.type} />
                <StatusIndicator status={connector.status} error={connector.error} />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border-default)]">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-[var(--text-primary)]">
                      {connector.profilesCount}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">Profiles</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-[var(--text-primary)]">
                      {(connector.totalSent / 1000).toFixed(1)}K
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">Sent</div>
                  </div>
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
            <Mail className="empty-state-icon" />
            <h3 className="empty-state-title">No providers found</h3>
            <p className="empty-state-description">
              {searchQuery
                ? 'No providers match your search'
                : 'Add your first email provider to start sending'}
            </p>
            {!searchQuery && (
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Add Provider
              </button>
            )}
          </div>
        </div>
      )}

      <CreateConnectorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
