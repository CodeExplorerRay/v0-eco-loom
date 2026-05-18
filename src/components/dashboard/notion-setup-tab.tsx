// Notion Setup Tab Component - Production Ready with Full Integration

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  dashboardHeroControlSurfaceClassName,
  dashboardHeroTabsListClassName,
  dashboardHeroTabsTriggerClassName,
  DashboardHeroCard,
} from '@/components/dashboard/dashboard-hero-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Key, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ExternalLink,
  Clock,
  AlertCircle,
  Zap,
  ArrowRight,
  Copy,
  Eye,
  EyeOff,
  DatabaseBackup,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { AuditCenterRequest, NotionConfig, NotionStatus } from '@/lib/types';

interface NotionSetupTabProps {
  onOpenAuditCenter?: (filters: AuditCenterRequest['filters'], title?: string) => void;
  onOpenKnowledgeBase?: () => void;
}

export function NotionSetupTab({
  onOpenAuditCenter,
  onOpenKnowledgeBase,
}: NotionSetupTabProps) {
  const [config, setConfig] = useState<NotionConfig | null>(null);
  const [status, setStatus] = useState<NotionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingKnowledgeBase, setIsSyncingKnowledgeBase] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    syncedItems: number;
    skippedItems?: number;
    queuedTasks?: number;
    processedTasks?: number;
  } | null>(null);
  const [knowledgeBaseSyncResult, setKnowledgeBaseSyncResult] = useState<{
    success: boolean;
    syncedItems: number;
    failedItems?: number;
    totalItems?: number;
    message?: string;
    errors?: string[];
  } | null>(null);
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string; summary?: Record<string, unknown> } | null>(null);
  const [dataCounts, setDataCounts] = useState<Record<string, number> | null>(null);
  const [hasExistingSampleData, setHasExistingSampleData] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [formData, setFormData] = useState({
    apiKey: '',
    databaseIdLedger: '',
    databaseIdGoals: '',
    databaseIdReports: '',
    databaseIdDepts: '',
    databaseIdKnowledgeBase: '',
  });
  const hasStoredApiKey = Boolean(config?.apiKey);
  const hasStoredLedgerDbId = Boolean(config?.databaseIdLedger);
  const hasStoredGoalsDbId = Boolean(config?.databaseIdGoals);
  const hasStoredReportsDbId = Boolean(config?.databaseIdReports);
  const hasStoredDeptsDbId = Boolean(config?.databaseIdDepts);
  const hasStoredKnowledgeBaseDbId = Boolean(config?.databaseIdKnowledgeBase);

  // Fetch existing config on mount
  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/notion/config');
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setConfig(data);
          setFormData({
            apiKey: '',
            databaseIdLedger: '',
            databaseIdGoals: '',
            databaseIdReports: '',
            databaseIdDepts: '',
            databaseIdKnowledgeBase: '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching Notion config:', error);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/notion/status', { cache: 'no-store' });
      if (response.ok) {
        setStatus(await response.json());
      }
    } catch (error) {
      console.error('Error fetching Notion status:', error);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  // Fetch current data counts
  const fetchDataCounts = useCallback(async () => {
    try {
      const response = await fetch('/api/seed');
      if (response.ok) {
        const data = await response.json();
        setDataCounts(data.counts);
        setHasExistingSampleData(Boolean(data.hasData));
      }
    } catch (error) {
      console.error('Error fetching data counts:', error);
    }
  }, []);

  useEffect(() => {
    fetchDataCounts();
  }, [fetchDataCounts]);

  // Handle seeding sample data
  const handleSeedData = async (replaceExisting = false) => {
    setIsSeeding(true);
    setSeedResult(null);
    try {
      const response = await fetch('/api/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearExisting: replaceExisting }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setSeedResult({ 
          success: true, 
          message: result.message,
          summary: result.summary 
        });
        toast.success('Sample data created successfully!');
        fetchDataCounts();
      } else if (response.status === 409 && result.code === 'SEED_DATA_EXISTS') {
        setSeedResult({
          success: false,
          message: result.error || 'Sample data already exists.',
          summary: result.counts,
        });
        setHasExistingSampleData(true);
        toast.error('Sample data already exists. Replace it instead of generating duplicates.');
      } else {
        setSeedResult({ 
          success: false, 
          message: result.error || 'Failed to seed data' 
        });
        toast.error('Failed to create sample data');
      }
    } catch (error) {
      console.error('Error seeding data:', error);
      setSeedResult({ 
        success: false, 
        message: 'Network error. Please try again.' 
      });
      toast.error('Network error. Please try again.');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSave = async () => {
    if (!formData.apiKey && !hasStoredApiKey) {
      toast.error('API Key is required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/notion/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      const result = await response.json();
      const savedConfig = result.config ?? result;
      setConfig(savedConfig);
      void fetchConfig();
      void fetchStatus();
      setFormData({
        apiKey: '',
        databaseIdLedger: '',
        databaseIdGoals: '',
        databaseIdReports: '',
        databaseIdDepts: '',
        databaseIdKnowledgeBase: '',
      });
      setKnowledgeBaseSyncResult(null);
      toast.success('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    if (!formData.apiKey) {
      toast.error('Please enter an API Key first');
      return;
    }

    // Validate API key format
    if (!formData.apiKey.startsWith('secret_') && !formData.apiKey.startsWith('ntn_')) {
      setTestResult({ 
        success: false, 
        message: 'Invalid API key format. Notion API keys should start with "secret_" or "ntn_"' 
      });
      toast.error('Invalid API key format');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/notion/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, testOnly: true }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setTestResult({ success: true, message: result.message || 'Connection successful!' });
        toast.success('Notion connection successful!');
      } else {
        // Show detailed error message
        const errorMsg = result.error || 'Connection failed';
        const details = result.details ? `\nCode: ${result.details.code}` : '';
        setTestResult({ success: false, message: errorMsg + details });
        toast.error('Connection failed. Check the error details below.');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestResult({ success: false, message: 'Network error. Please check your internet connection and try again.' });
      toast.error('Network error. Please try again.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncTo = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch('/api/notion/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: 'to_notion' }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setSyncResult({
          success: true,
          syncedItems: result.syncedItems || 0,
          skippedItems: result.skippedItems || 0,
          queuedTasks: result.queuedTasks || 0,
          processedTasks: result.agentRun?.completed || 0,
        });
        if (result.syncedItems > 0) {
          toast.success(`Synced ${result.syncedItems} items to Notion`);
        } else if (result.errors?.length > 0) {
          toast.error(result.errors[0]);
        } else {
          toast.warning('No new items to sync. All items may already be synced.');
        }
        void fetchStatus();
      } else {
        setSyncResult({ success: false, syncedItems: 0 });
        toast.error(result.error || result.message || 'Sync failed');
      }
    } catch (error) {
      console.error('Error syncing to Notion:', error);
      setSyncResult({ success: false, syncedItems: 0 });
      toast.error('Sync failed. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncFrom = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch('/api/notion/sync-from', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();
      
      if (response.ok) {
        setSyncResult({
          success: true,
          syncedItems: result.syncedItems || 0,
          skippedItems: result.skippedItems || 0,
          queuedTasks: result.queuedTasks || 0,
          processedTasks: result.agentRun?.completed || 0,
        });
        toast.success(
          `Imported ${result.syncedItems || 0} items from Notion and processed ${result.agentRun?.completed || 0} agent jobs`
        );
        void fetchStatus();
      } else {
        setSyncResult({ success: false, syncedItems: 0 });
        toast.error(result.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Error syncing from Notion:', error);
      setSyncResult({ success: false, syncedItems: 0 });
      toast.error('Sync failed. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncKnowledgeBase = async () => {
    setIsSyncingKnowledgeBase(true);
    setKnowledgeBaseSyncResult(null);

    try {
      const response = await fetch('/api/notion/knowledge-base/sync', {
        method: 'POST',
      });

      const result = await response.json();
      if (response.ok) {
        setKnowledgeBaseSyncResult(result);
        if (result.success) {
          toast.success(`Knowledge Base refreshed in Notion (${result.syncedItems} articles)`);
        } else {
          toast.warning(result.message || 'Knowledge Base refresh completed with issues');
        }
        void fetchStatus();
        void fetchConfig();
      } else {
        setKnowledgeBaseSyncResult({
          success: false,
          syncedItems: 0,
          failedItems: 0,
          totalItems: 0,
          message: result.error || 'Knowledge Base sync failed',
          errors: result.errors,
        });
        toast.error(result.error || 'Knowledge Base sync failed');
      }
    } catch (error) {
      console.error('Error syncing Knowledge Base:', error);
      setKnowledgeBaseSyncResult({
        success: false,
        syncedItems: 0,
        message: 'Knowledge Base sync failed. Please try again.',
      });
      toast.error('Knowledge Base sync failed. Please try again.');
    } finally {
      setIsSyncingKnowledgeBase(false);
    }
  };

  const handleToggleSync = async (enabled: boolean) => {
    try {
      const response = await fetch('/api/notion/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncEnabled: enabled }),
      });

      if (response.ok) {
        setConfig(prev => prev ? { ...prev, syncEnabled: enabled } : null);
        void fetchStatus();
        toast.success(enabled ? 'Auto-sync enabled' : 'Auto-sync disabled');
      }
    } catch (error) {
      console.error('Error toggling sync:', error);
      toast.error('Failed to update sync settings');
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const knowledgeBaseHealthTone =
    status?.knowledgeBaseHealth === 'current'
      ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900'
      : status?.knowledgeBaseHealth === 'update_available'
        ? 'border-amber-200 bg-amber-50/80 text-amber-900'
        : status?.knowledgeBaseHealth === 'failed'
          ? 'border-rose-200 bg-rose-50/80 text-rose-900'
          : 'border-slate-200 bg-slate-50/80 text-slate-900';

  const knowledgeBaseHealthLabel =
    status?.knowledgeBaseHealth === 'current'
      ? 'Current in Notion'
      : status?.knowledgeBaseHealth === 'update_available'
        ? 'Refresh available'
        : status?.knowledgeBaseHealth === 'failed'
          ? 'Needs attention'
          : status?.knowledgeBaseHealth === 'needs_first_sync'
            ? 'Ready for first publish'
            : 'Not mapped';

  const knowledgeBaseTriggerLabel =
    status?.knowledgeBaseLastTrigger === 'config_save'
      ? 'Admin save'
      : status?.knowledgeBaseLastTrigger === 'sync_to_notion'
        ? 'Main sync'
        : status?.knowledgeBaseLastTrigger === 'status_check'
          ? 'Automatic refresh'
        : status?.knowledgeBaseLastTrigger === 'manual'
            ? 'Manual sync'
            : null;

  return (
    <Tabs defaultValue="workspace" className="space-y-6">
      <DashboardHeroCard
        title="Notion MCP Integration"
        description="Connect your Notion workspace for seamless data synchronization"
        icon={<Database className="h-8 w-8" />}
        gradientClassName="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500"
        eyebrow="Workspace Sync"
        eyebrowIcon={<Database className="h-3.5 w-3.5" />}
        asideClassName="w-full md:w-auto md:max-w-[34rem] md:justify-end"
        aside={
          <div className={dashboardHeroControlSurfaceClassName}>
            <TabsList className={dashboardHeroTabsListClassName}>
              <TabsTrigger value="workspace" className={dashboardHeroTabsTriggerClassName}>
                <Database className="h-4 w-4" />
                Workspace
              </TabsTrigger>
              <TabsTrigger value="knowledge" className={dashboardHeroTabsTriggerClassName}>
                <BookOpen className="h-4 w-4" />
                Knowledge Base
              </TabsTrigger>
              <TabsTrigger value="sync" className={dashboardHeroTabsTriggerClassName}>
                <RefreshCw className="h-4 w-4" />
                Sync
              </TabsTrigger>
              <TabsTrigger value="tools" className={dashboardHeroTabsTriggerClassName}>
                <DatabaseBackup className="h-4 w-4" />
                Tools
              </TabsTrigger>
            </TabsList>
          </div>
        }
      />

      <TabsContent value="workspace" className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Connection Status
            {config?.apiKey ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Configured
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                <AlertCircle className="h-3 w-3 mr-1" />
                Not Configured
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Your Notion workspace integration status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">
                  {status?.workspaceName || config?.workspaceName || 'Not Connected'}
                </p>
                {(status?.lastSyncAt || config?.lastSyncAt) && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last import from Notion: {format(new Date(status?.lastSyncAt || config?.lastSyncAt || ''), 'MMM d, yyyy h:mm a')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onOpenAuditCenter && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => onOpenAuditCenter({ feature: 'notion' }, 'Notion audit activity')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in Audit Center
                </Button>
              )}
              <Label htmlFor="sync-toggle" className="text-sm">Auto Sync</Label>
              <Switch
                id="sync-toggle"
                checked={config?.syncEnabled ?? true}
                onCheckedChange={handleToggleSync}
                disabled={!config?.apiKey}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={status?.ledgerConfigured ? 'border-emerald-200 text-emerald-700' : 'border-slate-200 text-slate-500'}>
              Ledger {status?.ledgerConfigured ? 'mapped' : 'not mapped'}
            </Badge>
            <Badge variant="outline" className={status?.goalsConfigured ? 'border-emerald-200 text-emerald-700' : 'border-slate-200 text-slate-500'}>
              Goals {status?.goalsConfigured ? 'mapped' : 'not mapped'}
            </Badge>
            <Badge variant="outline" className={status?.reportsConfigured ? 'border-emerald-200 text-emerald-700' : 'border-slate-200 text-slate-500'}>
              Reports {status?.reportsConfigured ? 'mapped' : 'not mapped'}
            </Badge>
            <Badge variant="outline" className={status?.facilitiesConfigured ? 'border-emerald-200 text-emerald-700' : 'border-slate-200 text-slate-500'}>
              Facilities / Sites {status?.facilitiesConfigured ? 'mapped' : 'not mapped'}
            </Badge>
            <Badge variant="outline" className={status?.knowledgeBaseConfigured ? 'border-emerald-200 text-emerald-700' : 'border-slate-200 text-slate-500'}>
              Knowledge Base {status?.knowledgeBaseConfigured ? 'mapped' : 'not mapped'}
            </Badge>
            <p className="text-xs text-muted-foreground">
              {status?.coreMappedDatabaseCount ?? 0} core Notion surfaces mapped for this workspace
            </p>
          </div>

          {testResult && (
            <Alert className={`mt-4 ${testResult.success ? 'border-green-500' : 'border-red-500'}`}>
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <AlertTitle>{testResult.success ? 'Connection Successful' : 'Connection Failed'}</AlertTitle>
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>Enter your Notion API credentials and destination database IDs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="apiKey">
              <Key className="h-4 w-4 inline mr-2" />
              API Key (Internal Integration Token)
            </Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                placeholder={config?.apiKey || 'secret_...'}
                value={formData.apiKey}
                onChange={e => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                className="pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                {formData.apiKey && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => copyToClipboard(formData.apiKey)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Create an integration at{' '}
              <a
                href="https://www.notion.so/my-integrations"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center"
              >
                notion.so/my-integrations
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </p>
            {hasStoredApiKey && (
              <p className="text-xs text-muted-foreground">
                A masked API key is stored already. Leave this blank to keep the current secret, or paste a new token to rotate it.
              </p>
            )}
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ledgerDb">
                <Database className="h-4 w-4 inline mr-2" />
                Carbon Ledger Database ID
              </Label>
              <Input
                id="ledgerDb"
                placeholder={config?.databaseIdLedger || 'e.g., a1b2c3d4e5f6...'}
                value={formData.databaseIdLedger}
                onChange={e => setFormData(prev => ({ ...prev, databaseIdLedger: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Database for storing carbon emissions entries</p>
              {hasStoredLedgerDbId && (
                <p className="text-xs text-muted-foreground">
                  A masked database ID is stored already. Leave this blank to keep the current hidden value, or paste a new ID to rotate it.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="goalsDb">
                <Database className="h-4 w-4 inline mr-2" />
                Sustainability Goals Database ID
              </Label>
              <Input
                id="goalsDb"
                placeholder={config?.databaseIdGoals || 'e.g., a1b2c3d4e5f6...'}
                value={formData.databaseIdGoals}
                onChange={e => setFormData(prev => ({ ...prev, databaseIdGoals: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Database for tracking sustainability targets</p>
              {hasStoredGoalsDbId && (
                <p className="text-xs text-muted-foreground">
                  A masked database ID is stored already. Leave this blank to keep the current hidden value, or paste a new ID to rotate it.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportsDb">
                <Database className="h-4 w-4 inline mr-2" />
                Reports Database ID
              </Label>
              <Input
                id="reportsDb"
                placeholder={config?.databaseIdReports || 'e.g., a1b2c3d4e5f6...'}
                value={formData.databaseIdReports}
                onChange={e => setFormData(prev => ({ ...prev, databaseIdReports: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Database for compliance reports</p>
              {hasStoredReportsDbId && (
                <p className="text-xs text-muted-foreground">
                  A masked database ID is stored already. Leave this blank to keep the current hidden value, or paste a new ID to rotate it.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deptsDb">
                <Database className="h-4 w-4 inline mr-2" />
                Facilities / Sites Database ID
              </Label>
              <Input
                id="deptsDb"
                placeholder={config?.databaseIdDepts || 'e.g., a1b2c3d4e5f6...'}
                value={formData.databaseIdDepts}
                onChange={e => setFormData(prev => ({ ...prev, databaseIdDepts: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Database for facility and site mappings</p>
              {hasStoredDeptsDbId && (
                <p className="text-xs text-muted-foreground">
                  A masked database ID is stored already. Leave this blank to keep the current hidden value, or paste a new ID to rotate it.
                </p>
              )}
            </div>

          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Configuration
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={isTesting || !formData.apiKey}>
              {isTesting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="knowledge" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Knowledge Base Health
          </CardTitle>
          <CardDescription>
            Track whether the Notion Knowledge Base destination is mapped, current, and ready for refresh.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`rounded-xl border p-4 ${knowledgeBaseHealthTone}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Knowledge Base database health</p>
                <p className="text-sm leading-6">
                  {status?.knowledgeBaseHealthMessage ||
                    'Knowledge Base status appears here once a destination database is configured.'}
                </p>
              </div>
              <Badge variant="outline" className="w-fit border-current/20 bg-white/70 text-current">
                {knowledgeBaseHealthLabel}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-current/80">
              <span>{status?.knowledgeBaseArticleCount ?? 0} articles ready to publish</span>
              <span>Knowledge Base database {status?.knowledgeBaseConfigured ? 'mapped' : 'not mapped'}</span>
              {status?.knowledgeBaseLastSyncedAt ? (
                <span>
                  Last refreshed {format(new Date(status.knowledgeBaseLastSyncedAt), 'MMM d, yyyy h:mm a')}
                </span>
              ) : (
                <span>No dedicated Knowledge Base refresh recorded yet</span>
              )}
              {knowledgeBaseTriggerLabel ? <span>Last trigger: {knowledgeBaseTriggerLabel}</span> : null}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-sm font-medium text-slate-900">Eco-Loom decides</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                Which Notion database receives each article. This stays config-driven so the routing
                is predictable, reviewable, and easy to audit later.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
              <p className="text-sm font-medium text-emerald-950">Notion custom agent handles</p>
              <p className="mt-1 text-sm leading-6 text-emerald-900/90">
                Classification, tagging, summary polish, stale-content review, and cross-linking
                between related articles once they are already in Notion.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Knowledge Base Database
          </CardTitle>
          <CardDescription>
            Use one Notion database as the single source of truth for Eco-Loom help content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
            <p className="text-sm font-medium text-emerald-950">Recommended operating model</p>
            <p className="mt-1 text-sm leading-6 text-emerald-900/90">
              Keep one Knowledge Base database in Notion as the primary source of truth. Eco-Loom
              publishes setup guides, FAQs, operations playbooks, and agent resources into that
              single database so the content stays easy to manage and reference over time.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={
                status?.knowledgeBaseConfigured
                  ? 'border-emerald-200 text-emerald-700'
                  : 'border-slate-200 text-slate-500'
              }
            >
              Knowledge Base {status?.knowledgeBaseConfigured ? 'mapped' : 'not mapped'}
            </Badge>
          </div>

          <div className="space-y-2">
            <Label htmlFor="knowledgeBaseDb">
              <Database className="h-4 w-4 inline mr-2" />
              General Knowledge Base Database ID
            </Label>
            <Input
              id="knowledgeBaseDb"
              placeholder={config?.databaseIdKnowledgeBase || 'e.g., a1b2c3d4e5f6...'}
              value={formData.databaseIdKnowledgeBase}
              onChange={e => setFormData(prev => ({ ...prev, databaseIdKnowledgeBase: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Eco-Loom publishes all Knowledge Base content into this one Notion database.
            </p>
            {hasStoredKnowledgeBaseDbId && (
              <p className="text-xs text-muted-foreground">
                A masked database ID is stored already. Leave this blank to keep the current hidden
                value, or paste a new ID to rotate it.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="sync" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sync Operating Model</CardTitle>
          <CardDescription>Keep manual actions and scheduled refresh behavior easy to review.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-sm font-medium text-slate-900">How Auto Sync works</p>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              Auto Sync uses the production Vercel cron runner to pull fresh Notion changes and then process queued Eco-Loom follow-up jobs.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sync Options */}
      <Card>
        <CardHeader>
          <CardTitle>Data Synchronization</CardTitle>
          <CardDescription>Sync your data between Eco-Loom and Notion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg border hover:border-primary/50 transition-colors">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-green-500" />
                Push to Notion
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Sync your carbon entries, goals, reports, and knowledge base from Eco-Loom to your Notion workspace.
              </p>
              <Button onClick={handleSyncTo} disabled={isSyncing || !config?.apiKey} className="w-full">
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sync to Notion
              </Button>
            </div>

            <div className="p-4 rounded-lg border hover:border-primary/50 transition-colors">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-blue-500 rotate-180" />
                Pull from Notion
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Import data from your Notion databases into Eco-Loom.
              </p>
              <Button variant="outline" onClick={handleSyncFrom} disabled={isSyncing || !config?.apiKey} className="w-full">
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sync from Notion
              </Button>
            </div>

            <div className="p-4 rounded-lg border hover:border-primary/50 transition-colors">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-600" />
                Sync Knowledge Base
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Refresh the Notion Knowledge Base database with Eco-Loom guides, FAQs, operations playbooks, and agent resources.
              </p>
              <Button
                variant="secondary"
                onClick={handleSyncKnowledgeBase}
                disabled={isSyncingKnowledgeBase || !config?.apiKey || !status?.knowledgeBaseConfigured}
                className="w-full"
              >
                {isSyncingKnowledgeBase ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BookOpen className="h-4 w-4 mr-2" />
                )}
                Sync Knowledge Base
              </Button>
            </div>
          </div>

          {syncResult && (
            <Alert className={`mt-4 ${syncResult.success ? 'border-green-500' : 'border-red-500'}`}>
              {syncResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <AlertTitle>{syncResult.success ? 'Sync Complete' : 'Sync Failed'}</AlertTitle>
              <AlertDescription>
                {syncResult.success 
                  ? `Successfully synced ${syncResult.syncedItems} items.` +
                    (typeof syncResult.skippedItems === 'number' ? ` Skipped ${syncResult.skippedItems}.` : '') +
                    (typeof syncResult.queuedTasks === 'number' ? ` Queued ${syncResult.queuedTasks} agent jobs.` : '') +
                    (typeof syncResult.processedTasks === 'number' ? ` Processed ${syncResult.processedTasks} agent jobs.` : '')
                  : 'An error occurred during synchronization.'}
              </AlertDescription>
            </Alert>
          )}

          {knowledgeBaseSyncResult && (
            <Alert className={`mt-4 ${knowledgeBaseSyncResult.success ? 'border-green-500' : 'border-amber-500'}`}>
              {knowledgeBaseSyncResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
              <AlertTitle>
                {knowledgeBaseSyncResult.success ? 'Knowledge Base Refreshed' : 'Knowledge Base Needs Attention'}
              </AlertTitle>
              <AlertDescription>
                {knowledgeBaseSyncResult.message ||
                  `Synced ${knowledgeBaseSyncResult.syncedItems} Knowledge Base articles to Notion.`}
                {typeof knowledgeBaseSyncResult.failedItems === 'number' &&
                knowledgeBaseSyncResult.failedItems > 0
                  ? ` Failed ${knowledgeBaseSyncResult.failedItems}.`
                  : ''}
                {knowledgeBaseSyncResult.errors?.length
                  ? ` ${knowledgeBaseSyncResult.errors.slice(0, 2).join(' | ')}`
                  : ''}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="tools" className="space-y-6">
      {/* Sample Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseBackup className="h-5 w-5" />
            Sample Data
          </CardTitle>
          <CardDescription>Generate clearly labeled internal sample records for testing, demos, and workflow walkthroughs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Current Data Counts */}
            {dataCounts && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-2xl font-bold text-primary">{dataCounts.departments || 0}</p>
                  <p className="text-xs text-muted-foreground">Facilities</p>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-2xl font-bold text-primary">{dataCounts.ledgerEntries || 0}</p>
                  <p className="text-xs text-muted-foreground">Ledger Entries</p>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-2xl font-bold text-primary">{dataCounts.goals || 0}</p>
                  <p className="text-xs text-muted-foreground">Goals</p>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-2xl font-bold text-primary">{dataCounts.reports || 0}</p>
                  <p className="text-xs text-muted-foreground">Reports</p>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-2xl font-bold text-primary">{(dataCounts.departments || 0) + (dataCounts.ledgerEntries || 0) + (dataCounts.goals || 0) + (dataCounts.reports || 0)}</p>
                  <p className="text-xs text-muted-foreground">Total Records</p>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-3">
              {!hasExistingSampleData ? (
                <Button onClick={() => handleSeedData(false)} disabled={isSeeding} className="flex-1">
                  {isSeeding ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate Sample Data
                </Button>
              ) : (
                <Button onClick={() => handleSeedData(true)} disabled={isSeeding} className="flex-1">
                  {isSeeding ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <DatabaseBackup className="h-4 w-4 mr-2" />
                  )}
                  Replace Sample Data
                </Button>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              {!hasExistingSampleData
                ? 'This creates a demo company with 6 facilities, 12 months of ledger activity, 7 sustainability goals, and report examples that stay inside internal review-safe sample states.'
                : 'Sample data already exists. Eco-Loom now replaces the current sample workspace instead of creating duplicate demo records or touching unrelated live data.'}
            </p>

            {seedResult && (
              <Alert className={`mt-4 ${seedResult.success ? 'border-green-500' : 'border-red-500'}`}>
                {seedResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <AlertTitle>{seedResult.success ? 'Data Generated' : 'Generation Failed'}</AlertTitle>
                <AlertDescription>
                  {seedResult.success && seedResult.summary ? (
                    <span>
                      Created: {String(seedResult.summary.departments)} facilities, {' '}
                      {String(seedResult.summary.ledgerEntries)} ledger entries, {' '}
                      {String(seedResult.summary.goals)} goals, {' '}
                      {String(seedResult.summary.reports)} reports
                    </span>
                  ) : (
                    seedResult.message
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Need setup help?
          </CardTitle>
          <CardDescription>
            Setup steps, FAQs, cron guidance, and the Notion agent resource kit now live in the dedicated Notion MCP knowledge base.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-950">Moved out of the live setup surface</p>
            <p className="text-sm text-muted-foreground">
              Open Ops Atlas for the full setup guide, troubleshooting answers, and agent handoff templates.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={onOpenKnowledgeBase}
            disabled={!onOpenKnowledgeBase}
          >
            <BookOpen className="h-4 w-4" />
            Open Ops Atlas
          </Button>
        </CardContent>
      </Card>
      </TabsContent>
    </Tabs>
  );
}
