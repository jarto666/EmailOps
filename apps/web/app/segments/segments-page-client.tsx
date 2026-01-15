'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Database,
  Code,
  Play,
  RefreshCw,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

// Mock data
const mockConnectors = [
  { id: '1', name: 'Production DB', type: 'POSTGRES' },
  { id: '2', name: 'Analytics', type: 'BIGQUERY' },
];

const mockSegments = [
  {
    id: '1',
    name: 'Active Users (30d)',
    description: 'Users who logged in within the last 30 days',
    dataConnectorId: '1',
    dataConnector: { name: 'Production DB', type: 'POSTGRES' },
    sqlQuery: `SELECT user_id as recipient_id, email, jsonb_build_object('name', first_name) as vars
FROM users
WHERE last_login_at > NOW() - INTERVAL '30 days'`,
    lastRunCount: 45230,
    lastRunAt: '2024-01-14T10:30:00Z',
  },
  {
    id: '2',
    name: 'Low Credit Users',
    description: 'Users with credits below threshold',
    dataConnectorId: '1',
    dataConnector: { name: 'Production DB', type: 'POSTGRES' },
    sqlQuery: `SELECT user_id as recipient_id, email, jsonb_build_object('credits', credits) as vars
FROM users
WHERE credits < 100`,
    lastRunCount: 3420,
    lastRunAt: '2024-01-13T14:20:00Z',
  },
  {
    id: '3',
    name: 'Premium Subscribers',
    description: 'Active premium plan subscribers',
    dataConnectorId: '2',
    dataConnector: { name: 'Analytics', type: 'BIGQUERY' },
    sqlQuery: `SELECT user_id as recipient_id, email, STRUCT(plan_name, renewal_date) as vars
FROM subscriptions
WHERE plan_type = 'premium' AND status = 'active'`,
    lastRunCount: 12890,
    lastRunAt: '2024-01-14T08:00:00Z',
  },
];

const defaultSqlQuery = `SELECT
  user_id::text AS recipient_id,
  email::text AS email,
  jsonb_build_object(
    'user', jsonb_build_object('firstName', first_name)
  ) AS vars
FROM users
WHERE created_at > NOW() - INTERVAL '7 days'`;

function CreateSegmentModal({
  isOpen,
  onClose,
  connectors,
}: {
  isOpen: boolean;
  onClose: () => void;
  connectors: typeof mockConnectors;
}) {
  const [sqlQuery, setSqlQuery] = useState(defaultSqlQuery);
  const [testResult, setTestResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);

  if (!isOpen) return null;

  const handleTest = () => {
    // Simulate test
    setTestResult({ success: true, count: 1542 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl w-full max-w-3xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Create Segment</h2>
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
                placeholder="e.g., Active Users (30d)"
              />
            </div>
            <div>
              <label className="label">Data Connector</label>
              <select className="select">
                {connectors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <input
              type="text"
              className="input"
              placeholder="Brief description of this segment"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">SQL Query</label>
              <button type="button" onClick={handleTest} className="btn btn-ghost text-sm py-1.5">
                <Play className="w-4 h-4" />
                Test Query
              </button>
            </div>
            <div className="relative">
              <textarea
                className="textarea font-mono text-sm h-56"
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                spellCheck={false}
              />
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <Code className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-muted)]">SQL</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-[var(--text-muted)]">
              Required columns: <code className="text-indigo-400">recipient_id</code>, <code className="text-indigo-400">email</code>.
              Optional: <code className="text-indigo-400">vars</code> (JSONB for template variables)
            </div>
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
                  <div>
                    <span className="text-emerald-400 font-medium">Query successful</span>
                    <span className="text-[var(--text-secondary)] ml-2">
                      {testResult.count?.toLocaleString()} recipients found
                    </span>
                  </div>
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
              Create Segment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SegmentsPageClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredSegments = mockSegments.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <div className="skeleton" style={{ height: '32px', width: '192px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ height: '16px', width: '288px' }} />
        </div>
        <div className="skeleton" style={{ height: '256px', borderRadius: '16px' }} />
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex-between mb-lg">
        <div>
          <h1 className="page-title">Segments</h1>
          <p className="page-description">
            Define audiences with SQL queries for targeted campaigns
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          New Segment
        </button>
      </div>

      {/* Info Card */}
      <div className="card-glow mb-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium text-[var(--text-primary)] mb-1">
              SQL-First Segmentation
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Write SQL queries directly against your data sources. Your query must return{' '}
              <code className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">recipient_id</code> and{' '}
              <code className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">email</code> columns.
              Add <code className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">vars</code> for template personalization.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="search-container">
        <Search className="search-icon" style={{ width: '20px', height: '20px' }} />
        <input
          type="text"
          placeholder="Search segments..."
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Segments List */}
      {filteredSegments.length > 0 ? (
        <div className="list-container">
          {filteredSegments.map((segment) => (
            <div key={segment.id} className="card-glow group">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-purple-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/segments/${segment.id}`}
                      className="text-lg font-semibold text-[var(--text-primary)] hover:text-indigo-400 transition-colors"
                    >
                      {segment.name}
                    </Link>
                    {segment.description && (
                      <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                        {segment.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-3">
                      <span className="badge badge-default">
                        <Database className="w-3 h-3 mr-1" />
                        {segment.dataConnector?.name}
                      </span>
                      <span className="text-sm text-[var(--text-muted)]">
                        {segment.lastRunCount?.toLocaleString()} recipients
                      </span>
                      {segment.lastRunAt && (
                        <span className="text-sm text-[var(--text-muted)]">
                          Last run: {new Date(segment.lastRunAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="btn btn-ghost p-2">
                    <Play className="w-4 h-4" />
                  </button>
                  <button className="btn btn-ghost p-2">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button className="btn btn-ghost p-2 text-rose-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* SQL Preview */}
              <div className="mt-4 bg-[var(--bg-tertiary)] rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-[var(--text-secondary)] font-mono whitespace-pre-wrap">
                  {segment.sqlQuery}
                </pre>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <Users className="empty-state-icon" />
            <h3 className="empty-state-title">No segments found</h3>
            <p className="empty-state-description">
              {searchQuery
                ? 'No segments match your search'
                : 'Create your first segment to define your audience'}
            </p>
            {!searchQuery && (
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Create Segment
              </button>
            )}
          </div>
        </div>
      )}

      <CreateSegmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        connectors={mockConnectors}
      />
    </div>
  );
}
