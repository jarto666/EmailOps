'use client';

import { useState } from 'react';
import {
  Settings,
  Bell,
  Shield,
  Database,
  Globe,
  Key,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="card-glow">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
          <p className="text-sm text-[var(--text-secondary)]">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1000);
  };

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
            Settings
          </h1>
          <p className="text-[var(--text-secondary)]">
            Configure your EmailOps instance
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <SettingsSection
          title="General"
          description="Basic configuration for your EmailOps instance"
          icon={Settings}
        >
          <div className="space-y-4">
            <div>
              <label className="label">Instance Name</label>
              <input
                type="text"
                className="input"
                defaultValue="EmailOps"
                placeholder="Your instance name"
              />
            </div>
            <div>
              <label className="label">Default Timezone</label>
              <select className="select" defaultValue="UTC">
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
              </select>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Used for scheduling and reporting
              </p>
            </div>
          </div>
        </SettingsSection>

        {/* API & Security */}
        <SettingsSection
          title="API & Security"
          description="API keys and authentication settings"
          icon={Key}
        >
          <div className="space-y-4">
            <div>
              <label className="label">API Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  className="input font-mono flex-1"
                  defaultValue="eo_sk_live_xxxxxxxxxxxxxxxxxxxxxxxx"
                  readOnly
                />
                <button className="btn btn-secondary">
                  Regenerate
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Use this key to authenticate API requests
              </p>
            </div>
            <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="font-medium text-[var(--text-primary)]">HTTPS Only</div>
                  <div className="text-sm text-[var(--text-secondary)]">Require secure connections</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-[var(--bg-primary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
              </label>
            </div>
          </div>
        </SettingsSection>

        {/* Email Defaults */}
        <SettingsSection
          title="Email Defaults"
          description="Default settings for email campaigns"
          icon={Globe}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Default Batch Size</label>
                <input
                  type="number"
                  className="input"
                  defaultValue={100}
                  min={10}
                  max={1000}
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Recipients per batch
                </p>
              </div>
              <div>
                <label className="label">Rate Limit (per second)</label>
                <input
                  type="number"
                  className="input"
                  defaultValue={50}
                  min={1}
                  max={100}
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Max emails per second
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Default Collision Window</label>
                <select className="select" defaultValue="86400">
                  <option value="21600">6 hours</option>
                  <option value="43200">12 hours</option>
                  <option value="86400">24 hours</option>
                  <option value="172800">48 hours</option>
                  <option value="604800">7 days</option>
                </select>
              </div>
              <div>
                <label className="label">Query Timeout (seconds)</label>
                <input
                  type="number"
                  className="input"
                  defaultValue={30}
                  min={5}
                  max={300}
                />
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection
          title="Notifications"
          description="Configure alerts and notifications"
          icon={Bell}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="font-medium text-[var(--text-primary)]">Campaign Failures</div>
                  <div className="text-sm text-[var(--text-secondary)]">Alert when a campaign run fails</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-[var(--bg-primary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-lg">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-rose-400" />
                <div>
                  <div className="font-medium text-[var(--text-primary)]">Connector Errors</div>
                  <div className="text-sm text-[var(--text-secondary)]">Alert when a data connector fails</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-[var(--bg-primary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
              </label>
            </div>
            <div>
              <label className="label">Webhook URL (optional)</label>
              <input
                type="url"
                className="input"
                placeholder="https://your-webhook.example.com/alerts"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Send alerts to this webhook (Slack, Discord, etc.)
              </p>
            </div>
          </div>
        </SettingsSection>

        {/* System Info */}
        <SettingsSection
          title="System Information"
          description="Instance details and version info"
          icon={Info}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
              <div className="text-sm text-[var(--text-muted)]">Version</div>
              <div className="text-lg font-mono text-[var(--text-primary)]">1.0.0-alpha</div>
            </div>
            <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
              <div className="text-sm text-[var(--text-muted)]">Environment</div>
              <div className="text-lg font-mono text-[var(--text-primary)]">Production</div>
            </div>
            <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
              <div className="text-sm text-[var(--text-muted)]">Database</div>
              <div className="text-lg font-mono text-emerald-400">Connected</div>
            </div>
            <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
              <div className="text-sm text-[var(--text-muted)]">Redis</div>
              <div className="text-lg font-mono text-emerald-400">Connected</div>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
