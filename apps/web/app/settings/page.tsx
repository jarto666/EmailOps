'use client';

import { useState, useEffect } from 'react';
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
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { settings as settingsApi, WorkspaceSettings } from '@/lib/api';

function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Toggle({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => setChecked(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
        checked ? 'bg-primary' : 'bg-secondary'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [instanceName, setInstanceName] = useState('EmailOps');
  const [timezone, setTimezone] = useState('UTC');
  const [batchSize, setBatchSize] = useState(100);
  const [rateLimitPerSecond, setRateLimitPerSecond] = useState(50);
  const [collisionWindow, setCollisionWindow] = useState(86400);
  const [queryTimeout, setQueryTimeout] = useState(30);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await settingsApi.get();
        setInstanceName(data.instanceName);
        setTimezone(data.timezone);
        setBatchSize(data.batchSize);
        setRateLimitPerSecond(data.rateLimitPerSecond);
        setCollisionWindow(data.collisionWindow);
        setQueryTimeout(data.queryTimeout);
      } catch (e: any) {
        setError(e.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await settingsApi.update({
        instanceName,
        timezone,
        batchSize,
        rateLimitPerSecond,
        collisionWindow,
        queryTimeout,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-slide-up">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Configure your EmailOps instance
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* General Settings */}
        <SettingsSection
          title="General"
          description="Basic configuration for your EmailOps instance"
          icon={Settings}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Instance Name</Label>
              <Input
                type="text"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="Your instance name"
              />
            </div>
            <div className="space-y-2">
              <Label>Default Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">America/New_York</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                  <SelectItem value="Europe/London">Europe/London</SelectItem>
                  <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
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
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  className="font-mono flex-1"
                  defaultValue="eo_sk_live_xxxxxxxxxxxxxxxxxxxxxxxx"
                  readOnly
                />
                <Button variant="secondary">
                  Regenerate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this key to authenticate API requests
              </p>
            </div>
            <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="font-medium">HTTPS Only</div>
                  <div className="text-sm text-muted-foreground">Require secure connections</div>
                </div>
              </div>
              <Toggle defaultChecked />
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
              <div className="space-y-2">
                <Label>Default Batch Size</Label>
                <Input
                  type="number"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value) || 100)}
                  min={10}
                  max={1000}
                />
                <p className="text-xs text-muted-foreground">
                  Recipients per batch (10-1000)
                </p>
              </div>
              <div className="space-y-2">
                <Label>Rate Limit (per second)</Label>
                <Input
                  type="number"
                  value={rateLimitPerSecond}
                  onChange={(e) => setRateLimitPerSecond(parseInt(e.target.value) || 50)}
                  min={1}
                  max={500}
                />
                <p className="text-xs text-muted-foreground">
                  Max emails per second (1-500)
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Collision Window</Label>
                <Select value={String(collisionWindow)} onValueChange={(v) => setCollisionWindow(parseInt(v))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="21600">6 hours</SelectItem>
                    <SelectItem value="43200">12 hours</SelectItem>
                    <SelectItem value="86400">24 hours</SelectItem>
                    <SelectItem value="172800">48 hours</SelectItem>
                    <SelectItem value="604800">7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Query Timeout (seconds)</Label>
                <Input
                  type="number"
                  value={queryTimeout}
                  onChange={(e) => setQueryTimeout(parseInt(e.target.value) || 30)}
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
            <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="font-medium">Campaign Failures</div>
                  <div className="text-sm text-muted-foreground">Alert when a campaign run fails</div>
                </div>
              </div>
              <Toggle defaultChecked />
            </div>
            <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-rose-400" />
                <div>
                  <div className="font-medium">Connector Errors</div>
                  <div className="text-sm text-muted-foreground">Alert when a data connector fails</div>
                </div>
              </div>
              <Toggle defaultChecked />
            </div>
            <div className="space-y-2">
              <Label>Webhook URL (optional)</Label>
              <Input
                type="url"
                placeholder="https://your-webhook.example.com/alerts"
              />
              <p className="text-xs text-muted-foreground">
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
            <div className="p-4 bg-secondary rounded-lg">
              <div className="text-sm text-muted-foreground">Version</div>
              <div className="text-lg font-mono">1.0.0-alpha</div>
            </div>
            <div className="p-4 bg-secondary rounded-lg">
              <div className="text-sm text-muted-foreground">Environment</div>
              <div className="text-lg font-mono">Production</div>
            </div>
            <div className="p-4 bg-secondary rounded-lg">
              <div className="text-sm text-muted-foreground">Database</div>
              <div className="text-lg font-mono text-emerald-400">Connected</div>
            </div>
            <div className="p-4 bg-secondary rounded-lg">
              <div className="text-sm text-muted-foreground">Redis</div>
              <div className="text-lg font-mono text-emerald-400">Connected</div>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
