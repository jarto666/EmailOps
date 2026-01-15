'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  Eye,
  Copy,
  Code,
  Palette,
  Type,
  Image,
  Square,
} from 'lucide-react';

// Mock data
const mockComponents = [
  {
    id: '1',
    name: 'brand-header',
    displayName: 'Brand Header',
    type: 'HEADER',
    contentType: 'MJML',
    description: 'Standard header with logo and navigation',
    usageCount: 8,
    variables: ['logoUrl', 'companyName'],
    previewHtml: '<div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; text-align: center; color: white;">Brand Header Preview</div>',
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    name: 'footer-links',
    displayName: 'Footer with Links',
    type: 'FOOTER',
    contentType: 'MJML',
    description: 'Footer with social links and unsubscribe',
    usageCount: 12,
    variables: ['unsubscribeUrl', 'socialLinks'],
    previewHtml: '<div style="background: #1a1a2e; padding: 20px; text-align: center; color: #888;">Footer Preview</div>',
    createdAt: '2024-01-02',
  },
  {
    id: '3',
    name: 'cta-button',
    displayName: 'CTA Button',
    type: 'BUTTON',
    contentType: 'MJML',
    description: 'Primary call-to-action button',
    usageCount: 24,
    variables: ['buttonText', 'buttonUrl', 'buttonColor'],
    previewHtml: '<div style="text-align: center; padding: 20px;"><span style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 12px 32px; border-radius: 8px; display: inline-block;">Click Here</span></div>',
    createdAt: '2024-01-03',
  },
  {
    id: '4',
    name: 'product-card',
    displayName: 'Product Card',
    type: 'SECTION',
    contentType: 'MJML',
    description: 'Product showcase with image and details',
    usageCount: 6,
    variables: ['productName', 'productImage', 'productPrice', 'productUrl'],
    previewHtml: '<div style="background: #0a0a0f; border: 1px solid #1e1e2e; border-radius: 12px; padding: 20px; text-align: center; color: white;">Product Card Preview</div>',
    createdAt: '2024-01-05',
  },
  {
    id: '5',
    name: 'divider-line',
    displayName: 'Divider Line',
    type: 'DIVIDER',
    contentType: 'MJML',
    description: 'Simple horizontal divider',
    usageCount: 15,
    variables: ['color', 'width'],
    previewHtml: '<div style="padding: 20px;"><hr style="border: none; border-top: 1px solid #2a2a3e;" /></div>',
    createdAt: '2024-01-04',
  },
];

function ComponentTypeBadge({ type }: { type: string }) {
  const styles: Record<string, { class: string; icon: any }> = {
    HEADER: { class: 'badge-primary', icon: Type },
    FOOTER: { class: 'badge-default', icon: Square },
    BUTTON: { class: 'badge-success', icon: Square },
    SECTION: { class: 'badge-warning', icon: Layers },
    DIVIDER: { class: 'badge-default', icon: Square },
    IMAGE: { class: 'badge-primary', icon: Image },
  };

  const style = styles[type] || { class: 'badge-default', icon: Layers };
  const Icon = style.icon;

  return (
    <span className={`badge ${style.class}`}>
      <Icon className="w-3 h-3 mr-1" />
      {type}
    </span>
  );
}

const defaultMjmlContent = `<mj-section>
  <mj-column>
    <mj-text>
      Your component content here
    </mj-text>
  </mj-column>
</mj-section>`;

function CreateComponentModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [content, setContent] = useState(defaultMjmlContent);
  const [variables, setVariables] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl w-full max-w-3xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Create Component</h2>
          <button onClick={onClose} className="btn btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form className="space-y-5">
          <div className="form-grid">
            <div>
              <label className="label">Component Name</label>
              <input
                type="text"
                className="input font-mono"
                placeholder="brand-header"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Unique identifier for this component
              </p>
            </div>
            <div>
              <label className="label">Display Name</label>
              <input
                type="text"
                className="input"
                placeholder="Brand Header"
              />
            </div>
          </div>

          <div className="form-grid">
            <div>
              <label className="label">Type</label>
              <select className="select">
                <option value="HEADER">Header</option>
                <option value="FOOTER">Footer</option>
                <option value="BUTTON">Button</option>
                <option value="SECTION">Section</option>
                <option value="DIVIDER">Divider</option>
                <option value="IMAGE">Image</option>
              </select>
            </div>
            <div>
              <label className="label">Content Type</label>
              <select className="select">
                <option value="MJML">MJML</option>
                <option value="HTML">HTML</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <input
              type="text"
              className="input"
              placeholder="Brief description of this component"
            />
          </div>

          <div>
            <label className="label">Variables (comma-separated)</label>
            <input
              type="text"
              className="input font-mono"
              placeholder="logoUrl, companyName, primaryColor"
              value={variables}
              onChange={(e) => setVariables(e.target.value)}
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Define variables that can be customized when using this component
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">MJML Content</label>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Code className="w-4 h-4" />
                MJML
              </div>
            </div>
            <textarea
              className="textarea font-mono text-sm h-48"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Use {'{{variableName}}'} syntax for dynamic values
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Component
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmailComponentsPageClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredComponents = mockComponents.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <div className="skeleton" style={{ height: '32px', width: '192px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ height: '16px', width: '288px' }} />
        </div>
        <div className="cards-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton" style={{ height: '256px', borderRadius: '16px' }} />
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
          <h1 className="page-title">Components</h1>
          <p className="page-description">
            Reusable email building blocks for consistent branding
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          New Component
        </button>
      </div>

      {/* Info Card */}
      <div className="card-glow mb-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium text-[var(--text-primary)] mb-1">
              Component Library
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Create reusable MJML/HTML components like headers, footers, and buttons.
              Use them across templates to maintain consistent branding and reduce duplication.
              Components support variables for customization.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-container">
          <Search className="search-icon" style={{ width: '20px', height: '20px' }} />
          <input
            type="text"
            placeholder="Search components..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="select"
          style={{ width: 'auto' }}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="HEADER">Header</option>
          <option value="FOOTER">Footer</option>
          <option value="BUTTON">Button</option>
          <option value="SECTION">Section</option>
          <option value="DIVIDER">Divider</option>
        </select>
      </div>

      {/* Components Grid */}
      {filteredComponents.length > 0 ? (
        <div className="cards-grid">
          {filteredComponents.map((component) => (
            <div key={component.id} className="card-glow group overflow-hidden">
              {/* Preview */}
              <div
                className="h-24 -mx-6 -mt-6 mb-4 overflow-hidden"
                dangerouslySetInnerHTML={{ __html: component.previewHtml || '' }}
              />

              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] hover:text-indigo-400 transition-colors cursor-pointer">
                    {component.displayName}
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] font-mono">
                    {component.name}
                  </p>
                </div>
                <div className="relative">
                  <button className="btn btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {component.description && (
                <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">
                  {component.description}
                </p>
              )}

              <div className="flex items-center gap-2 mb-3">
                <ComponentTypeBadge type={component.type} />
                <span className="badge badge-default">
                  <Code className="w-3 h-3 mr-1" />
                  {component.contentType}
                </span>
              </div>

              {component.variables && component.variables.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {component.variables.map((v) => (
                    <span
                      key={v}
                      className="text-xs bg-[var(--bg-tertiary)] text-[var(--text-muted)] px-2 py-0.5 rounded font-mono"
                    >
                      {'{{'}{v}{'}}'}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border-default)]">
                <div className="text-sm text-[var(--text-muted)]">
                  Used in {component.usageCount} templates
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
            <Layers className="empty-state-icon" />
            <h3 className="empty-state-title">No components found</h3>
            <p className="empty-state-description">
              {searchQuery || typeFilter !== 'all'
                ? 'No components match your filters'
                : 'Create your first component to start building your library'}
            </p>
            {!searchQuery && typeFilter === 'all' && (
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Create Component
              </button>
            )}
          </div>
        </div>
      )}

      <CreateComponentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
