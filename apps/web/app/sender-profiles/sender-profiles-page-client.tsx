'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  UserCircle,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  Mail,
  AtSign,
  MessageSquare,
  Send,
} from 'lucide-react';

// Mock data
const mockConnectors = [
  { id: '1', name: 'AWS SES Production', type: 'SES' },
  { id: '2', name: 'Resend Transactional', type: 'RESEND' },
];

const mockProfiles = [
  {
    id: '1',
    fromEmail: 'news@company.com',
    fromName: 'Company News',
    replyTo: 'support@company.com',
    connectorId: '1',
    connector: { name: 'AWS SES Production', type: 'SES' },
    totalSent: 89450,
    campaignsCount: 12,
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    fromEmail: 'noreply@company.com',
    fromName: 'Company',
    replyTo: null,
    connectorId: '1',
    connector: { name: 'AWS SES Production', type: 'SES' },
    totalSent: 34230,
    campaignsCount: 5,
    createdAt: '2024-01-05',
  },
  {
    id: '3',
    fromEmail: 'alerts@company.com',
    fromName: 'Company Alerts',
    replyTo: 'support@company.com',
    connectorId: '2',
    connector: { name: 'Resend Transactional', type: 'RESEND' },
    totalSent: 12890,
    campaignsCount: 3,
    createdAt: '2024-01-10',
  },
];

function CreateProfileModal({
  isOpen,
  onClose,
  connectors,
}: {
  isOpen: boolean;
  onClose: () => void;
  connectors: typeof mockConnectors;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Create Sender Profile</h2>
          <button onClick={onClose} className="btn btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form className="space-y-5">
          <div>
            <label className="label">Email Provider</label>
            <select className="select">
              {connectors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">From Email</label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="email"
                className="input pl-10"
                placeholder="news@yourdomain.com"
              />
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Must be verified with your email provider
            </p>
          </div>

          <div>
            <label className="label">From Name</label>
            <input
              type="text"
              className="input"
              placeholder="Your Company"
            />
          </div>

          <div>
            <label className="label">Reply-To (Optional)</label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="email"
                className="input pl-10"
                placeholder="support@yourdomain.com"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SenderProfilesPageClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredProfiles = mockProfiles.filter(
    (p) =>
      p.fromEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.fromName?.toLowerCase().includes(searchQuery.toLowerCase())
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
          <h1 className="page-title">Sender Profiles</h1>
          <p className="page-description">
            Configure sender identities for your campaigns
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          New Profile
        </button>
      </div>

      {/* Info Card */}
      <div className="card-glow mb-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
            <UserCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium text-[var(--text-primary)] mb-1">
              Sender Identity
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Each profile defines a sender identity (from address, name, reply-to) linked to an email provider.
              Use different profiles for newsletters, transactional emails, and alerts.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="search-container">
        <Search className="search-icon" style={{ width: '20px', height: '20px' }} />
        <input
          type="text"
          placeholder="Search profiles..."
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Profiles Grid */}
      {filteredProfiles.length > 0 ? (
        <div className="cards-grid">
          {filteredProfiles.map((profile) => (
            <div key={profile.id} className="card-glow group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400">
                  <UserCircle className="w-6 h-6" />
                </div>
                <div className="relative">
                  <button className="btn btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <Link href={`/sender-profiles/${profile.id}`} className="block mb-3">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] hover:text-indigo-400 transition-colors">
                  {profile.fromName || profile.fromEmail}
                </h3>
                <p className="text-sm text-[var(--text-muted)] font-mono mt-1">
                  {profile.fromEmail}
                </p>
              </Link>

              {profile.replyTo && (
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-4">
                  <MessageSquare className="w-4 h-4" />
                  <span>Reply to: {profile.replyTo}</span>
                </div>
              )}

              <div className="flex items-center gap-2 mb-4">
                <span className="badge badge-default">
                  <Mail className="w-3 h-3 mr-1" />
                  {profile.connector?.name}
                </span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border-default)]">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-[var(--text-primary)]">
                      {profile.campaignsCount}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">Campaigns</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-[var(--text-primary)]">
                      {(profile.totalSent / 1000).toFixed(1)}K
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">Sent</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
            <UserCircle className="empty-state-icon" />
            <h3 className="empty-state-title">No profiles found</h3>
            <p className="empty-state-description">
              {searchQuery
                ? 'No profiles match your search'
                : 'Create your first sender profile to start sending'}
            </p>
            {!searchQuery && (
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Create Profile
              </button>
            )}
          </div>
        </div>
      )}

      <CreateProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        connectors={mockConnectors}
      />
    </div>
  );
}
