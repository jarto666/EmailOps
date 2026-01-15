'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  X,
  Eye,
  Tag,
  Clock,
  CheckCircle2,
} from 'lucide-react';

// Mock data
const mockTemplates = [
  {
    id: '1',
    key: 'welcome-email',
    name: 'Welcome Email',
    category: 'TRANSACTIONAL',
    activeVersion: { id: 'v1', name: 'v1.2', subject: 'Welcome to {{company}}!' },
    versionsCount: 3,
    lastUsed: '2024-01-14T10:30:00Z',
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    key: 'weekly-digest',
    name: 'Weekly Digest',
    category: 'MARKETING',
    activeVersion: { id: 'v2', name: 'v2.0', subject: 'Your weekly update from {{company}}' },
    versionsCount: 5,
    lastUsed: '2024-01-13T08:00:00Z',
    createdAt: '2023-12-15',
  },
  {
    id: '3',
    key: 'password-reset',
    name: 'Password Reset',
    category: 'TRANSACTIONAL',
    activeVersion: { id: 'v3', name: 'v1.0', subject: 'Reset your password' },
    versionsCount: 1,
    lastUsed: '2024-01-14T15:45:00Z',
    createdAt: '2024-01-10',
  },
  {
    id: '4',
    key: 'low-credits-alert',
    name: 'Low Credits Alert',
    category: 'BOTH',
    activeVersion: { id: 'v4', name: 'v1.1', subject: 'Your credits are running low' },
    versionsCount: 2,
    lastUsed: '2024-01-12T12:00:00Z',
    createdAt: '2024-01-05',
  },
];

function CategoryBadge({ category }: { category: string }) {
  const styles = {
    MARKETING: 'badge-primary',
    TRANSACTIONAL: 'badge-success',
    BOTH: 'badge-warning',
  };

  return (
    <span className={`badge ${styles[category as keyof typeof styles] || 'badge-default'}`}>
      {category}
    </span>
  );
}

function CreateTemplateModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Create Template</h2>
          <button onClick={onClose} className="btn btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form className="space-y-5">
          <div>
            <label className="label">Template Key</label>
            <input
              type="text"
              className="input font-mono"
              placeholder="welcome-email"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Unique identifier used in API calls
            </p>
          </div>

          <div>
            <label className="label">Name</label>
            <input
              type="text"
              className="input"
              placeholder="Welcome Email"
            />
          </div>

          <div>
            <label className="label">Category</label>
            <select className="select">
              <option value="MARKETING">Marketing</option>
              <option value="TRANSACTIONAL">Transactional</option>
              <option value="BOTH">Both</option>
            </select>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Affects unsubscribe handling and compliance
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TemplatesPageClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredTemplates = mockTemplates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <div className="skeleton" style={{ height: '32px', width: '192px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ height: '16px', width: '288px' }} />
        </div>
        <div className="cards-grid-2">
          {[1, 2, 3, 4].map((i) => (
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
          <h1 className="page-title">Templates</h1>
          <p className="page-description">
            Manage email templates with version control
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-container">
          <Search className="search-icon" style={{ width: '20px', height: '20px' }} />
          <input
            type="text"
            placeholder="Search templates..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="select"
          style={{ width: 'auto' }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          <option value="MARKETING">Marketing</option>
          <option value="TRANSACTIONAL">Transactional</option>
          <option value="BOTH">Both</option>
        </select>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="cards-grid-2">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="card-glow group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center text-blue-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2">
                  <CategoryBadge category={template.category} />
                  <div className="relative">
                    <button className="btn btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <Link href={`/templates/${template.id}`} className="block mb-3">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] hover:text-indigo-400 transition-colors">
                  {template.name}
                </h3>
                <p className="text-sm text-[var(--text-muted)] font-mono mt-1">
                  {template.key}
                </p>
              </Link>

              {template.activeVersion && (
                <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-[var(--text-secondary)]">
                      Active: <span className="text-[var(--text-primary)]">{template.activeVersion.name}</span>
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-muted)] truncate">
                    {template.activeVersion.subject}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border-default)]">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
                    <Tag className="w-4 h-4" />
                    {template.versionsCount} versions
                  </div>
                  {template.lastUsed && (
                    <div className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
                      <Clock className="w-4 h-4" />
                      {new Date(template.lastUsed).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="btn btn-ghost p-2">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="btn btn-ghost p-2">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button className="btn btn-ghost p-2">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <FileText className="empty-state-icon" />
            <h3 className="empty-state-title">No templates found</h3>
            <p className="empty-state-description">
              {searchQuery || categoryFilter !== 'all'
                ? 'No templates match your filters'
                : 'Create your first email template to get started'}
            </p>
            {!searchQuery && categoryFilter === 'all' && (
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Create Template
              </button>
            )}
          </div>
        </div>
      )}

      <CreateTemplateModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
