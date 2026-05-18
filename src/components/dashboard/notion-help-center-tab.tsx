'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  dashboardHeroControlSurfaceClassName,
  dashboardHeroTabsListClassName,
  dashboardHeroTabsTriggerClassName,
  DashboardHeroCard,
} from '@/components/dashboard/dashboard-hero-card';
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
import { toast } from 'sonner';
import {
  BookOpen,
  Bot,
  CheckCircle2,
  Copy,
  ExternalLink,
  LifeBuoy,
  ShieldCheck,
  Wrench,
} from 'lucide-react';

export function NotionHelpCenterTab() {
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Tabs defaultValue="setup" className="space-y-6">
      <DashboardHeroCard
        title="Notion MCP Help Resources"
        description="Keep setup guidance, troubleshooting answers, and handoff resources in one dedicated support surface."
        icon={<BookOpen className="h-8 w-8" />}
        gradientClassName="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500"
        eyebrow="Help & FAQs"
        eyebrowIcon={<LifeBuoy className="h-3.5 w-3.5" />}
        asideClassName="w-full md:w-auto md:max-w-[32rem] md:justify-end"
        aside={
          <div className={dashboardHeroControlSurfaceClassName}>
            <TabsList className={dashboardHeroTabsListClassName}>
              <TabsTrigger value="setup" className={dashboardHeroTabsTriggerClassName}>
                <BookOpen className="h-4 w-4" />
                Setup Guide
              </TabsTrigger>
              <TabsTrigger value="faq" className={dashboardHeroTabsTriggerClassName}>
                <LifeBuoy className="h-4 w-4" />
                FAQs
              </TabsTrigger>
              <TabsTrigger value="operations" className={dashboardHeroTabsTriggerClassName}>
                <ShieldCheck className="h-4 w-4" />
                Operations
              </TabsTrigger>
              <TabsTrigger value="agent-kit" className={dashboardHeroTabsTriggerClassName}>
                <Bot className="h-4 w-4" />
                Agent Kit
              </TabsTrigger>
            </TabsList>
          </div>
        }
      />

      <Card>
        <CardContent className="pt-6">
            <TabsContent value="setup" className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <p className="text-sm font-medium text-emerald-950">Quick setup flow</p>
                <p className="mt-1 text-sm text-emerald-900/90">
                  Follow these steps when connecting a fresh Notion workspace. Save the configuration and test the connection before enabling regular sync.
                </p>
              </div>
              <div className="space-y-4">
                {NOTION_SETUP_GUIDE_STEPS.map((item) => {
                  const guideLink = 'link' in item ? item.link : undefined;

                  return (
                    <div key={item.step} className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                        {item.step}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                          {guideLink && (
                            <a
                              href={guideLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-1 inline-flex items-center text-primary hover:underline"
                            >
                              Open Notion
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="faq" className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm font-medium text-slate-950">Common setup and sync questions</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  These answers cover the most common Notion MCP issues teams hit during first-time setup and operational handoff.
                </p>
              </div>
              <Accordion type="single" collapsible className="rounded-xl border bg-white px-4">
                {NOTION_FAQ_ITEMS.map((item) => (
                  <AccordionItem key={item.id} value={item.id}>
                    <AccordionTrigger className="text-left text-sm font-medium">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-6 text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>

            <TabsContent value="operations" className="space-y-6">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <p className="text-sm font-medium text-emerald-950">Production operations</p>
                <p className="mt-1 text-sm text-emerald-900/90">
                  Use this section during launch, handoff, and ongoing support when the Notion MCP connection needs to stay reliable, auditable, and production-ready.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">Production checklist</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Run through this list before you treat the Notion MCP connection as a live operational dependency.
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {NOTION_PRODUCTION_CHECKLIST.map((item) => (
                    <Card key={item.id} className="border-emerald-100 bg-white/95 shadow-sm">
                      <CardHeader className="space-y-2 pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          {item.title}
                        </CardTitle>
                        <CardDescription className="text-sm leading-6">
                          {item.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ul className="space-y-2 text-sm text-slate-700">
                          {item.bullets.map((bullet) => (
                            <li key={bullet} className="flex gap-2">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">Troubleshooting playbooks</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    These quick-response guides cover the most common production issues across cron, queue activity, schema mapping, and Vercel plan limits.
                  </p>
                </div>
                <Accordion type="single" collapsible className="rounded-xl border bg-white px-4">
                  {NOTION_OPERATIONS_PLAYBOOKS.map((item) => (
                    <AccordionItem key={item.id} value={item.id}>
                      <AccordionTrigger className="text-left">
                        <div className="flex items-start gap-3">
                          <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <div>
                            <p className="text-sm font-medium text-slate-950">{item.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.whenToUse}</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ol className="space-y-2 text-sm leading-6 text-muted-foreground">
                          {item.steps.map((step, index) => (
                            <li key={step} className="flex gap-3">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                                {index + 1}
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </TabsContent>

            <TabsContent value="agent-kit" className="space-y-6">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <p className="text-sm font-medium text-emerald-950">Admin resources</p>
                <p className="mt-1 text-sm text-emerald-900/90">
                  Copy these resources into Notion when you are ready to set up recurring reviews, custom agent instructions, and the Agent Ops workspace.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Scheduled Runner</Label>
                    <p className="text-xs text-muted-foreground">
                      Use this copy block when preparing the recurring production runner that keeps Notion follow-up work moving without a manual trigger.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => copyToClipboard(CRON_SETUP_INSTRUCTIONS)}
                  >
                    <Copy className="h-4 w-4" />
                    Copy Setup
                  </Button>
                </div>
                <Accordion type="single" collapsible className="rounded-xl border bg-white px-4">
                  <AccordionItem value="scheduled-runner-preview">
                    <AccordionTrigger className="text-left text-sm font-medium">
                      Preview copy block
                    </AccordionTrigger>
                    <AccordionContent>
                      <Textarea value={CRON_SETUP_INSTRUCTIONS} readOnly className="min-h-44 font-mono text-xs" />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Custom Agent Instructions</Label>
                    <p className="text-xs text-muted-foreground">
                      Use this as the base prompt for your Notion custom agent so its review rules match Eco-Loom&apos;s current operating policies and Agent Ops workflow.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => copyToClipboard(CUSTOM_AGENT_INSTRUCTIONS_TEMPLATE)}
                  >
                    <Copy className="h-4 w-4" />
                    Copy Instructions
                  </Button>
                </div>
                <Accordion type="single" collapsible className="rounded-xl border bg-white px-4">
                  <AccordionItem value="custom-agent-preview">
                    <AccordionTrigger className="text-left text-sm font-medium">
                      Preview copy block
                    </AccordionTrigger>
                    <AccordionContent>
                      <Textarea value={CUSTOM_AGENT_INSTRUCTIONS_TEMPLATE} readOnly className="min-h-[34rem] font-mono text-xs" />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Agent Ops Database Template</Label>
                    <p className="text-xs text-muted-foreground">
                      Create one Notion database for review items, verification queues, duplicate checks, and report readiness work.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => copyToClipboard(AGENT_OPS_DATABASE_TEMPLATE)}
                  >
                    <Copy className="h-4 w-4" />
                    Copy Template
                  </Button>
                </div>
                <Accordion type="single" collapsible className="rounded-xl border bg-white px-4">
                  <AccordionItem value="agent-ops-database-preview">
                    <AccordionTrigger className="text-left text-sm font-medium">
                      Preview copy block
                    </AccordionTrigger>
                    <AccordionContent>
                      <Textarea value={AGENT_OPS_DATABASE_TEMPLATE} readOnly className="min-h-72 font-mono text-xs" />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Agent Ops Page Template</Label>
                    <p className="text-xs text-muted-foreground">
                      Use this page as the workspace summary surface for recent changes, verification queues, goal risk review, and monthly report readiness.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => copyToClipboard(AGENT_OPS_PAGE_TEMPLATE)}
                  >
                    <Copy className="h-4 w-4" />
                    Copy Template
                  </Button>
                </div>
                <Accordion type="single" collapsible className="rounded-xl border bg-white px-4">
                  <AccordionItem value="agent-ops-page-preview">
                    <AccordionTrigger className="text-left text-sm font-medium">
                      Preview copy block
                    </AccordionTrigger>
                    <AccordionContent>
                      <Textarea value={AGENT_OPS_PAGE_TEMPLATE} readOnly className="min-h-64 font-mono text-xs" />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  );
}
