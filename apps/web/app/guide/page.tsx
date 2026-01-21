"use client";

import { useState } from "react";
import {
  BookOpen,
  Database,
  Mail,
  Send,
  Users,
  FileText,
  Layers,
  AlertTriangle,
  Settings,
  Zap,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CheckCircle,
  Clock,
  Shield,
} from "lucide-react";

interface GuideSection {
  id: string;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

function Accordion({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border-default rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 bg-secondary hover:bg-muted/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-primary" />
          <span className="font-medium text-foreground">{title}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 bg-background border-t border-border-default">
          {children}
        </div>
      )}
    </div>
  );
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-2 mt-3">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">
            {i + 1}
          </span>
          <span className="text-muted-foreground pt-0.5">{step}</span>
        </li>
      ))}
    </ol>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-muted/50 rounded-lg p-4 overflow-x-auto text-sm font-mono text-muted-foreground mt-3">
      {children}
    </pre>
  );
}

export default function GuidePage() {
  return (
    <div className="animate-slide-up max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Guide</h1>
            <p className="text-muted-foreground">Learn how to use EmailOps</p>
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <div className="card p-6 mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Quick Start
        </h2>
        <p className="text-muted-foreground mb-4">
          To send your first campaign, complete these steps in order:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              step: 1,
              title: "Add Data Connector",
              desc: "Connect your database",
              href: "/data-connectors",
            },
            {
              step: 2,
              title: "Add Email Provider",
              desc: "Configure AWS SES or SMTP",
              href: "/email-connectors",
            },
            {
              step: 3,
              title: "Create Sender Profile",
              desc: "Set up your sender identity",
              href: "/sender-profiles",
            },
            {
              step: 4,
              title: "Create Segment",
              desc: "Define your audience with SQL",
              href: "/segments",
            },
            {
              step: 5,
              title: "Create Template",
              desc: "Design your email content",
              href: "/templates",
            },
            {
              step: 6,
              title: "Create Campaign",
              desc: "Combine everything and send",
              href: "/campaigns",
            },
          ].map((item) => (
            <a
              key={item.step}
              href={item.href}
              className="flex items-start gap-3 p-4 rounded-lg bg-secondary hover:bg-muted/50 transition-colors group"
            >
              <span className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center">
                {item.step}
              </span>
              <div>
                <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {item.title}
                </div>
                <div className="text-sm text-muted-foreground">{item.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="space-y-4">
        <Accordion title="Data Connectors" icon={Database} defaultOpen>
          <p className="text-muted-foreground">
            Data connectors allow EmailOps to query your database for recipient
            lists. We use a <strong>zero-ETL approach</strong> — your data stays
            in your database, and we query it in real-time when building
            audiences.
          </p>
          <h4 className="font-medium text-foreground mt-4 mb-2">
            Supported Databases
          </h4>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>
              <strong>PostgreSQL</strong> — Connection string format
            </li>
            <li>
              <strong>BigQuery</strong> — Service account credentials
            </li>
          </ul>
          <h4 className="font-medium text-foreground mt-4 mb-2">Security</h4>
          <p className="text-muted-foreground">
            All credentials are encrypted at rest using AES-256. Queries are
            executed in read-only mode with statement timeouts to prevent
            runaway queries.
          </p>
        </Accordion>

        <Accordion title="Email Providers" icon={Mail}>
          <p className="text-muted-foreground">
            EmailOps uses a <strong>bring-your-own-infrastructure</strong>{" "}
            model. You connect your own email provider, keeping full control
            over deliverability and costs.
          </p>
          <h4 className="font-medium text-foreground mt-4 mb-2">
            Supported Providers
          </h4>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>
              <strong>AWS SES</strong> — Region, Access Key ID, Secret Access
              Key
            </li>
            <li>
              <strong>Resend</strong> — API Key
            </li>
            <li>
              <strong>SMTP</strong> — Host, Port, Username, Password, TLS
              settings
            </li>
          </ul>
          <h4 className="font-medium text-foreground mt-4 mb-2">
            AWS SES Webhook Setup
          </h4>
          <p className="text-muted-foreground mb-2">
            Each email provider has a unique webhook URL. After creating an SES
            provider, you&apos;ll see a webhook URL like:{" "}
            <code className="bg-muted/50 px-1 rounded">
              https://your-domain.com/webhooks/ses/abc123...
            </code>
          </p>
          <StepList
            steps={[
              "Create your SES email provider in EmailOps (copy the webhook URL shown)",
              'In AWS SNS, create a new topic (e.g., "ses-notifications-production")',
              "Subscribe your provider's unique webhook URL to the SNS topic",
              "In AWS SES, go to Configuration Sets → Create a new set",
              "Add event destinations for Bounce, Complaint, and Delivery events",
              "Point them to your SNS topic",
            ]}
          />
          <p className="text-xs text-muted-foreground mt-3">
            Note: Each SES provider has its own webhook URL. If you have
            multiple SES accounts (e.g., production and staging), create
            separate SNS topics and use each provider&apos;s unique URL.
          </p>
        </Accordion>

        <Accordion title="Segments (SQL Audiences)" icon={Users}>
          <p className="text-muted-foreground">
            Segments define your email audience using SQL queries. This gives
            you full flexibility to target any subset of your users.
          </p>
          <h4 className="font-medium text-foreground mt-4 mb-2">
            Required Columns
          </h4>
          <p className="text-muted-foreground mb-2">
            Your query must return these columns:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>
              <code className="bg-muted/50 px-1 rounded">recipient_id</code> or{" "}
              <code className="bg-muted/50 px-1 rounded">id</code> — Unique
              identifier
            </li>
            <li>
              <code className="bg-muted/50 px-1 rounded">email</code> —
              Recipient email address
            </li>
          </ul>
          <h4 className="font-medium text-foreground mt-4 mb-2">
            Optional: Template Variables
          </h4>
          <p className="text-muted-foreground mb-2">
            Include a <code className="bg-muted/50 px-1 rounded">vars</code>{" "}
            column with JSONB data for personalization:
          </p>
          <CodeBlock>{`SELECT
  id as recipient_id,
  email,
  jsonb_build_object(
    'first_name', first_name,
    'plan', subscription_plan,
    'last_login', last_login_at::text
  ) as vars
FROM users
WHERE subscription_plan = 'pro'
  AND email_verified = true`}</CodeBlock>
        </Accordion>

        <Accordion title="Templates" icon={FileText}>
          <p className="text-muted-foreground">
            Templates define your email content. We support multiple authoring
            modes:
          </p>
          <h4 className="font-medium text-foreground mt-4 mb-2">
            Authoring Modes
          </h4>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>
              <strong>Raw HTML</strong> — Write HTML directly
            </li>
            <li>
              <strong>MJML</strong> — Responsive email markup language
            </li>
            <li>
              <strong>UI Builder</strong> — Visual drag-and-drop editor
            </li>
          </ul>
          <h4 className="font-medium text-foreground mt-4 mb-2">Variables</h4>
          <p className="text-muted-foreground mb-2">
            Use Handlebars syntax for dynamic content:
          </p>
          <CodeBlock>{`Hello {{first_name}},

Your {{plan}} subscription is active.

{{#if last_login}}
  Last seen: {{last_login}}
{{/if}}`}</CodeBlock>
          <h4 className="font-medium text-foreground mt-4 mb-2">Versioning</h4>
          <p className="text-muted-foreground">
            Templates support versioning. Create new versions without affecting
            active campaigns, then activate when ready.
          </p>
        </Accordion>

        <Accordion title="Campaigns" icon={Send}>
          <p className="text-muted-foreground">
            Campaigns combine a template, segment, and sender profile to send
            emails.
          </p>
          <h4 className="font-medium text-foreground mt-4 mb-2">
            Schedule Types
          </h4>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>
              <strong>Manual</strong> — Trigger sends manually via UI or API
            </li>
            <li>
              <strong>CRON</strong> — Automated scheduling (e.g.,{" "}
              <code className="bg-muted/50 px-1 rounded">0 9 * * MON</code> =
              every Monday at 9am)
            </li>
          </ul>
          <h4 className="font-medium text-foreground mt-4 mb-2">
            Campaign Groups & Collision Detection
          </h4>
          <p className="text-muted-foreground mb-2">
            Prevent email fatigue by grouping related campaigns. When multiple
            campaigns target the same recipient within the collision window:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>
              <strong>Highest Priority Wins</strong> — Lower priority number =
              higher priority
            </li>
            <li>
              <strong>First Queued Wins</strong> — The campaign triggered first
              sends
            </li>
            <li>
              <strong>Send All</strong> — No collision prevention (use
              carefully)
            </li>
          </ul>
        </Accordion>

        <Accordion title="Suppressions" icon={AlertTriangle}>
          <p className="text-muted-foreground">
            Suppressions prevent emails from being sent to certain addresses.
            They are automatically created from bounces and complaints.
          </p>
          <h4 className="font-medium text-foreground mt-4 mb-2">
            Suppression Types
          </h4>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>
              <strong>Bounce</strong> — Hard bounces from invalid addresses
              (auto-added)
            </li>
            <li>
              <strong>Complaint</strong> — Spam complaints (auto-added, critical
              for deliverability)
            </li>
            <li>
              <strong>Unsubscribe</strong> — User opt-outs
            </li>
            <li>
              <strong>Manual</strong> — Manually added by operators
            </li>
          </ul>
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-200">
                Never remove complaint suppressions. High complaint rates can
                get your sending domain blacklisted.
              </p>
            </div>
          </div>
        </Accordion>

        <Accordion title="Rate Limiting & Delivery" icon={Clock}>
          <p className="text-muted-foreground">
            EmailOps implements rate limiting to protect your sender reputation
            and comply with provider limits.
          </p>
          <h4 className="font-medium text-foreground mt-4 mb-2">
            How It Works
          </h4>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Rate limits are applied per sender profile</li>
            <li>Uses a Redis-backed leaky bucket algorithm</li>
            <li>Default: 10 emails/second (configurable in Settings)</li>
          </ul>
          <h4 className="font-medium text-foreground mt-4 mb-2">
            Delivery Flow
          </h4>
          <StepList
            steps={[
              "Campaign triggered (manual or scheduled)",
              "Audience built from segment SQL query",
              "Collision detection filters recipients",
              "Suppression list checked",
              "Emails queued and sent with rate limiting",
              "Delivery/bounce/complaint events processed via webhooks",
            ]}
          />
        </Accordion>

        <Accordion title="Security Best Practices" icon={Shield}>
          <p className="text-muted-foreground">
            Follow these practices to keep your EmailOps instance secure:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-3">
            <li>Always use HTTPS in production</li>
            <li>
              Set a strong{" "}
              <code className="bg-muted/50 px-1 rounded">
                ENCRYPTION_SECRET
              </code>{" "}
              environment variable
            </li>
            <li>Restrict database connector permissions to read-only</li>
            <li>
              Use dedicated IAM credentials for AWS SES with minimal permissions
            </li>
            <li>
              Monitor suppression rates — high bounces indicate list quality
              issues
            </li>
            <li>Regularly review and test your segment queries</li>
          </ul>
        </Accordion>
      </div>

      {/* Footer */}
      <div className="mt-8 p-4 bg-secondary rounded-xl text-center">
        <p className="text-muted-foreground">
          Need more help? Check the{" "}
          <a
            href="https://github.com/your-org/email-ops"
            className="text-primary hover:underline"
          >
            documentation on GitHub
          </a>
        </p>
      </div>
    </div>
  );
}
