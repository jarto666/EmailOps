'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Send,
  Users,
  FileText,
  Layers,
  Database,
  Mail,
  UserCircle,
  Settings,
  Zap,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  Ban,
  BarChart3,
  BookOpen,
  Beaker,
} from 'lucide-react';

const navigation = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Campaigns',
    items: [
      { name: 'Single Sends', href: '/campaigns', icon: Send },
      { name: 'Campaign Groups', href: '/campaign-groups', icon: FolderKanban },
    ],
  },
  {
    title: 'Content',
    items: [
      { name: 'Templates', href: '/templates', icon: FileText },
      { name: 'Components', href: '/email-components', icon: Layers },
      { name: 'Segments', href: '/segments', icon: Users },
    ],
  },
  {
    title: 'Delivery',
    items: [
      { name: 'Suppressions', href: '/suppressions', icon: Ban },
    ],
  },
  {
    title: 'Infrastructure',
    items: [
      { name: 'Data Connectors', href: '/data-connectors', icon: Database },
      { name: 'Email Providers', href: '/email-connectors', icon: Mail },
      { name: 'Sender Profiles', href: '/sender-profiles', icon: UserCircle },
    ],
  },
  {
    title: 'System',
    items: [
      { name: 'Settings', href: '/settings', icon: Settings },
      { name: 'Guide', href: '/guide', icon: BookOpen },
      { name: 'Demo Tools', href: '/demo-tools', icon: Beaker },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Sync collapsed state with main content
  useEffect(() => {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      if (collapsed) {
        mainContent.classList.add('sidebar-collapsed');
      } else {
        mainContent.classList.remove('sidebar-collapsed');
      }
    }
  }, [collapsed]);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <Link href="/" className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Zap size={20} color="white" />
          </div>
          <span className="sidebar-logo-text">EmailOps</span>
        </Link>
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navigation.map((section) => (
          <div key={section.title} className="sidebar-section">
            <div className="sidebar-section-title">
              {section.title}
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`sidebar-nav-link ${isActive ? 'active' : ''}`}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon className="sidebar-nav-icon" />
                  <span className="sidebar-nav-text">{item.name}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-content">
          <div className="sidebar-footer-avatar">E</div>
          <div className="sidebar-footer-text">
            <div className="sidebar-footer-name">EmailOps</div>
            <div className="sidebar-footer-label">Self-hosted</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
