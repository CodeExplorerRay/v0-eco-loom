import {
  AGENT_OPS_DATABASE_TEMPLATE,
  AGENT_OPS_PAGE_TEMPLATE,
  CRON_SETUP_INSTRUCTIONS,
  CUSTOM_AGENT_INSTRUCTIONS_TEMPLATE,
} from '@/lib/notion/agent-ops-template';
import {
  NOTION_FAQ_ITEMS,
  NOTION_OPERATIONS_PLAYBOOKS,
  NOTION_PRODUCTION_CHECKLIST,
  NOTION_SETUP_GUIDE_STEPS,
} from '@/lib/notion/notion-help-content';

export type NotionKnowledgeBaseCategory =
  | 'Setup'
  | 'FAQ'
  | 'Operations'
  | 'Agent Resource';

export interface NotionKnowledgeBaseArticle {
  id: string;
  title: string;
  category: NotionKnowledgeBaseCategory;
  audience: 'Admin';
  summary: string;
  content: string;
}

function buildSetupGuideContent() {
  return [
    'Use this guide when connecting a new Notion workspace to Eco-Loom.',
    ...NOTION_SETUP_GUIDE_STEPS.map((step) =>
      [
        `${step.step}. ${step.title}`,
        step.description,
        'link' in step && step.link ? `Reference link: ${step.link}` : null,
      ]
        .filter(Boolean)
        .join('\n')
    ),
  ].join('\n\n');
}

function buildFaqContent() {
  return NOTION_FAQ_ITEMS.map((item) => `${item.question}\n${item.answer}`).join('\n\n');
}

function buildChecklistContent() {
  return NOTION_PRODUCTION_CHECKLIST.map((item) =>
    [
      item.title,
      item.description,
      ...item.bullets.map((bullet) => `- ${bullet}`),
    ].join('\n')
  ).join('\n\n');
}

function buildPlaybooksContent() {
  return NOTION_OPERATIONS_PLAYBOOKS.map((item) =>
    [
      item.title,
      `When to use: ${item.whenToUse}`,
      ...item.steps.map((step, index) => `${index + 1}. ${step}`),
    ].join('\n')
  ).join('\n\n');
}

export const NOTION_KNOWLEDGE_BASE_ARTICLES: NotionKnowledgeBaseArticle[] = [
  {
    id: 'notion-mcp-setup-guide',
    title: 'Notion MCP Setup Guide',
    category: 'Setup',
    audience: 'Admin',
    summary:
      'Step-by-step setup flow for connecting a fresh Notion workspace and validating the first sync.',
    content: buildSetupGuideContent(),
  },
  {
    id: 'notion-mcp-faq',
    title: 'Notion MCP Frequently Asked Questions',
    category: 'FAQ',
    audience: 'Admin',
    summary:
      'Answers to the most common setup, sync, queue, and deployment questions for the Notion integration.',
    content: buildFaqContent(),
  },
  {
    id: 'notion-mcp-production-checklist',
    title: 'Notion MCP Production Checklist',
    category: 'Operations',
    audience: 'Admin',
    summary:
      'Launch-readiness checklist for workspace boundaries, first sync validation, scheduled runs, and observability.',
    content: buildChecklistContent(),
  },
  {
    id: 'notion-mcp-operations-playbooks',
    title: 'Notion MCP Operations Playbooks',
    category: 'Operations',
    audience: 'Admin',
    summary:
      'Troubleshooting playbooks for cron authorization issues, idle queues, mapping problems, and Hobby plan limits.',
    content: buildPlaybooksContent(),
  },
  {
    id: 'notion-mcp-scheduled-runner',
    title: 'Scheduled Runner Reference',
    category: 'Agent Resource',
    audience: 'Admin',
    summary:
      'Operational reference for the production scheduled runner that keeps Notion follow-up work moving.',
    content: CRON_SETUP_INSTRUCTIONS,
  },
  {
    id: 'notion-mcp-custom-agent-instructions',
    title: 'Custom Agent Instructions',
    category: 'Agent Resource',
    audience: 'Admin',
    summary:
      'Base instruction set for the Notion custom agent so its review logic stays aligned with Eco-Loom.',
    content: CUSTOM_AGENT_INSTRUCTIONS_TEMPLATE,
  },
  {
    id: 'notion-mcp-agent-ops-database-template',
    title: 'Agent Ops Database Template',
    category: 'Agent Resource',
    audience: 'Admin',
    summary:
      'Template for the Notion database that stores review items, verification queues, and follow-up actions.',
    content: AGENT_OPS_DATABASE_TEMPLATE,
  },
  {
    id: 'notion-mcp-agent-ops-page-template',
    title: 'Agent Ops Page Template',
    category: 'Agent Resource',
    audience: 'Admin',
    summary:
      'Template for the Notion page that summarizes recent changes, queues, goal risk, and report readiness.',
    content: AGENT_OPS_PAGE_TEMPLATE,
  },
];
