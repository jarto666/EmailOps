"use client";

import { useState, useEffect, useCallback } from "react";
import { HelpCircle, X, ChevronRight } from "lucide-react";

interface HowToStep {
  title: string;
  description: string;
}

interface HowToModalProps {
  title: string;
  description: string;
  steps?: HowToStep[];
  tips?: string[];
}

export function HowToButton({
  title,
  description,
  steps,
  tips,
}: HowToModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn btn-secondary flex items-center gap-2"
        title="How to use this page"
      >
        <HelpCircle className="w-4 h-4" />
        <span>How to</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative w-full max-w-lg bg-background border border-border-default rounded-2xl shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border-default">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  {title}
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-tertiary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <p className="text-muted-foreground mb-6">{description}</p>

              {steps && steps.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Steps
                  </h3>
                  <div className="space-y-3">
                    {steps.map((step, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 bg-secondary rounded-lg"
                      >
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white text-sm font-medium flex items-center justify-center">
                          {i + 1}
                        </span>
                        <div>
                          <div className="font-medium text-foreground">
                            {step.title}
                          </div>
                          <div className="text-sm text-muted-foreground mt-0.5">
                            {step.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tips && tips.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Tips
                  </h3>
                  <ul className="space-y-2">
                    {tips.map((tip, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-muted-foreground"
                      >
                        <ChevronRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border-default bg-secondary rounded-b-2xl">
              <div className="flex items-center justify-between">
                <a
                  href="/guide"
                  className="text-sm text-primary hover:underline"
                >
                  View full guide
                </a>
                <button
                  onClick={() => setIsOpen(false)}
                  className="btn btn-primary"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Pre-configured HowTo content for each page
export const howToContent = {
  dashboard: {
    title: "Dashboard",
    description:
      "The dashboard shows an overview of your email operations, including recent activity and key metrics.",
    steps: [
      {
        title: "View Recent Campaigns",
        description: "See your latest campaign runs and their status",
      },
      {
        title: "Monitor Delivery",
        description: "Check delivery rates and identify issues",
      },
      {
        title: "Quick Actions",
        description: "Access common tasks from the sidebar navigation",
      },
    ],
    tips: [
      "Check the dashboard regularly to monitor your sending health",
      "Click on any campaign to see detailed delivery statistics",
    ],
  },
  analytics: {
    title: "Analytics",
    description:
      "Analytics provides detailed metrics about your email delivery performance over time.",
    steps: [
      {
        title: "Select Date Range",
        description: "Use the dropdown to view different time periods",
      },
      {
        title: "Review Metrics",
        description: "Monitor sent, delivered, bounced, and failed emails",
      },
      {
        title: "Check Campaign Performance",
        description: "See delivery rates for individual campaigns",
      },
    ],
    tips: [
      "A delivery rate below 95% may indicate list quality issues",
      "High bounce rates should be investigated immediately",
      "Review skip reasons to understand why emails were not sent",
    ],
  },
  campaigns: {
    title: "Campaigns",
    description:
      "Campaigns combine a template, segment, and sender profile to send emails to your audience.",
    steps: [
      {
        title: "Create Campaign",
        description: 'Click "New Campaign" and fill in the details',
      },
      {
        title: "Select Components",
        description: "Choose your template, segment, and sender profile",
      },
      {
        title: "Configure Schedule",
        description: "Set manual trigger or CRON schedule",
      },
      {
        title: "Review & Activate",
        description: "Preview your campaign and activate when ready",
      },
    ],
    tips: [
      "Use campaign groups to prevent sending multiple emails to the same recipient",
      "Test with a small segment before sending to your full audience",
      "Use manual trigger first, then set up automation once you're confident",
    ],
  },
  campaignGroups: {
    title: "Campaign Groups",
    description:
      "Campaign groups help prevent email fatigue by controlling how multiple campaigns target the same recipients.",
    steps: [
      {
        title: "Create Group",
        description: "Define a group with a collision window (e.g., 24 hours)",
      },
      {
        title: "Set Collision Policy",
        description:
          "Choose: highest priority wins, first queued wins, or send all",
      },
      {
        title: "Add Campaigns",
        description: "Assign campaigns to the group with priority numbers",
      },
    ],
    tips: [
      "Lower priority number = higher priority (1 beats 2)",
      'Use "highest priority wins" for promotional vs transactional campaigns',
      "The collision window starts from when a campaign is triggered",
    ],
  },
  templates: {
    title: "Templates",
    description:
      "Templates define the content and design of your emails using MJML, raw HTML, or the visual builder.",
    steps: [
      {
        title: "Create Template",
        description: "Choose your authoring mode: MJML, HTML, or UI Builder",
      },
      {
        title: "Add Variables",
        description: "Use {{variable_name}} syntax for personalization",
      },
      {
        title: "Preview & Test",
        description: "Preview with sample data before using in a campaign",
      },
      {
        title: "Version Control",
        description: "Create new versions without affecting active campaigns",
      },
    ],
    tips: [
      "MJML is recommended for responsive emails that work across all clients",
      'Variables come from the "vars" column in your segment SQL query',
      "Always test emails on multiple email clients before sending",
    ],
  },
  emailComponents: {
    title: "Email Components",
    description:
      "Reusable components that can be shared across multiple templates for consistency.",
    steps: [
      {
        title: "Create Component",
        description: "Build a reusable block (header, footer, etc.)",
      },
      {
        title: "Use in Templates",
        description: "Reference components in your templates",
      },
    ],
    tips: [
      "Use components for elements that appear in multiple templates",
      "Update a component once to change it everywhere",
    ],
  },
  segments: {
    title: "Segments",
    description:
      "Segments define your audience using SQL queries against your connected database.",
    steps: [
      {
        title: "Select Data Connector",
        description: "Choose which database to query",
      },
      {
        title: "Write SQL Query",
        description: "Return recipient_id, email, and optional vars column",
      },
      {
        title: "Test Query",
        description: "Preview the results before using in a campaign",
      },
    ],
    tips: [
      'The query must return at least "email" and "recipient_id" (or "id") columns',
      'Use JSONB for the "vars" column to pass template variables',
      "Queries run in read-only mode with statement timeouts",
    ],
  },
  suppressions: {
    title: "Suppressions",
    description:
      "Suppressions prevent emails from being sent to certain addresses, protecting your sender reputation.",
    steps: [
      {
        title: "Review Suppressions",
        description: "Check the list of suppressed emails and reasons",
      },
      {
        title: "Add Manual Suppression",
        description: "Block an email address from receiving emails",
      },
      {
        title: "Handle Bounces",
        description: "Bounces are automatically added from webhooks",
      },
    ],
    tips: [
      "Never remove complaint suppressions — this protects your domain reputation",
      "Hard bounces are permanent; soft bounces may be temporary",
      "Import existing suppression lists when migrating from another platform",
    ],
  },
  dataConnectors: {
    title: "Data Connectors",
    description:
      "Data connectors link EmailOps to your database for querying recipient data.",
    steps: [
      { title: "Add Connector", description: "Choose PostgreSQL or BigQuery" },
      {
        title: "Enter Credentials",
        description: "Provide connection string or service account",
      },
      {
        title: "Test Connection",
        description: "Verify the connection works before saving",
      },
    ],
    tips: [
      "Use read-only database credentials for security",
      "Credentials are encrypted at rest using AES-256",
      "Consider creating a dedicated database user with limited permissions",
    ],
  },
  emailConnectors: {
    title: "Email Providers",
    description:
      "Email providers are the services that actually send your emails (AWS SES, Resend, SMTP).",
    steps: [
      {
        title: "Add Provider",
        description: "Choose your email sending service",
      },
      {
        title: "Enter Credentials",
        description: "Provide API keys or SMTP credentials",
      },
      {
        title: "Copy Webhook URL",
        description: "Each provider gets a unique webhook URL for events",
      },
      {
        title: "Configure SNS/Webhooks",
        description: "Point your provider's events to the webhook URL",
      },
    ],
    tips: [
      "Each provider has its own unique webhook URL — copy it after creation",
      "AWS SES requires an SNS topic subscribed to your webhook URL",
      "Use dedicated IAM credentials with minimal permissions",
      "Monitor your sending quotas to avoid throttling",
    ],
  },
  senderProfiles: {
    title: "Sender Profiles",
    description:
      "Sender profiles define who emails are sent from (name, email address, reply-to).",
    steps: [
      {
        title: "Create Profile",
        description: "Enter sender name and email address",
      },
      {
        title: "Link Email Provider",
        description: "Choose which provider to send through",
      },
      {
        title: "Configure Reply-To",
        description: "Set where replies should go",
      },
    ],
    tips: [
      "The sender email must be verified in your email provider",
      "Use a recognizable sender name to improve open rates",
      "Consider using a different reply-to address for easy response tracking",
    ],
  },
  settings: {
    title: "Settings",
    description: "Configure global settings for your EmailOps instance.",
    steps: [
      {
        title: "Review Settings",
        description: "Check rate limits and other configurations",
      },
      {
        title: "Update as Needed",
        description: "Adjust settings based on your requirements",
      },
    ],
    tips: [
      "Rate limits protect your sender reputation",
      "Start with conservative limits and increase gradually",
    ],
  },
};
