import { LucideIcon, BookOpen, Cpu, Zap, Server, Code, Webhook, Database, HelpCircle, Layers } from 'lucide-react';

export interface DocSection {
  id: string;
  label: string;
  icon: LucideIcon;
  subsections?: { id: string; label: string }[];
}

export const DOC_SECTIONS: DocSection[] = [
  { 
    id: 'introduction', 
    label: 'Introduction', 
    icon: BookOpen,
    subsections: [
      { id: 'what-is-panoptes', label: 'What is Panoptes?' },
      { id: 'key-features', label: 'Key Features' },
      { id: 'use-cases', label: 'Use Cases' },
    ]
  },
  { 
    id: 'architecture', 
    label: 'Architecture', 
    icon: Cpu,
    subsections: [
      { id: 'system-overview', label: 'System Overview' },
      { id: 'data-flow', label: 'Data Flow' },
      { id: 'components', label: 'Components' },
    ]
  },
  { 
    id: 'why-demeter', 
    label: 'Why Demeter?', 
    icon: Layers,
    subsections: [
      { id: 'utxorpc-explained', label: 'UtxoRPC Explained' },
      { id: 'demeter-benefits', label: 'Benefits' },
      { id: 'alternatives', label: 'Alternatives' },
    ]
  },
  { 
    id: 'getting-started', 
    label: 'Getting Started', 
    icon: Zap,
    subsections: [
      { id: 'prerequisites', label: 'Prerequisites' },
      { id: 'installation', label: 'Installation' },
      { id: 'first-subscription', label: 'First Subscription' },
    ]
  },
  { 
    id: 'subscriptions', 
    label: 'Subscriptions', 
    icon: Webhook,
    subsections: [
      { id: 'creating-subscriptions', label: 'Creating Subscriptions' },
      { id: 'event-types', label: 'Event Types' },
      { id: 'filters', label: 'Filters & Targeting' },
      { id: 'rate-limiting', label: 'Rate Limiting' },
    ]
  },
  { 
    id: 'webhooks', 
    label: 'Webhooks', 
    icon: Code,
    subsections: [
      { id: 'payload-structure', label: 'Payload Structure' },
      { id: 'signature-verification', label: 'Signature Verification' },
      { id: 'retry-logic', label: 'Retry Logic' },
      { id: 'best-practices', label: 'Best Practices' },
    ]
  },
  { 
    id: 'configuration', 
    label: 'Configuration', 
    icon: Server,
    subsections: [
      { id: 'network-setup', label: 'Network Setup' },
      { id: 'demeter-api-key', label: 'Demeter API Key' },
      { id: 'environment-variables', label: 'Environment Variables' },
    ]
  },
  { 
    id: 'api-reference', 
    label: 'API Reference', 
    icon: Database,
    subsections: [
      { id: 'authentication', label: 'Authentication' },
      { id: 'endpoints', label: 'Endpoints' },
      { id: 'error-codes', label: 'Error Codes' },
    ]
  },
  { 
    id: 'troubleshooting', 
    label: 'Troubleshooting', 
    icon: HelpCircle,
    subsections: [
      { id: 'common-issues', label: 'Common Issues' },
      { id: 'debugging', label: 'Debugging' },
      { id: 'faq', label: 'FAQ' },
    ]
  },
];

export function flattenSections(): { id: string; label: string; parentId?: string }[] {
  const flat: { id: string; label: string; parentId?: string }[] = [];
  DOC_SECTIONS.forEach(section => {
    flat.push({ id: section.id, label: section.label });
    section.subsections?.forEach(sub => {
      flat.push({ id: sub.id, label: sub.label, parentId: section.id });
    });
  });
  return flat;
}
