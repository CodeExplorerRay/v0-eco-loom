'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bot, CheckCircle2, Clock3, Loader2, RefreshCw, RotateCcw, Search, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DashboardHeroActionButton,
  DashboardHeroCard,
} from '@/components/dashboard/dashboard-hero-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAgentTaskHistory, getAgentTasks, rescheduleAgentTask, retryAgentTask, runAgentTasks } from '@/lib/api';
import type { AgentTaskHistoryResponse, AgentTaskListResponse, AgentTaskRecord } from '@/lib/types';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
] as const;

const TASK_TYPE_OPTIONS = [
  { value: 'all', label: 'All tasks' },
  { value: 'classify_ledger_entry', label: 'Classify ledger entry' },
  { value: 'recalculate_goal_progress', label: 'Recalculate goal progress' },
  { value: 'draft_monthly_report', label: 'Draft monthly report' },
] as const;

export function AgentRunsTab() {
  const [data, setData] = useState<AgentTaskListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRunningNow, setIsRunningNow] = useState(false);
  const [draftStatusFilter, setDraftStatusFilter] = useState('all');
  const [draftTaskTypeFilter, setDraftTaskTypeFilter] = useState('all');
  const [draftSearch, setDraftSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<AgentTaskRecord | null>(null);
  const [selectedTaskHistory, setSelectedTaskHistory] = useState<AgentTaskHistoryResponse | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [taskActionLoading, setTaskActionLoading] = useState<'retry' | 'reschedule' | null>(null);
  const [rescheduleAt, setRescheduleAt] = useState('');

  const fetchTasks = useCallback(
    async (showRefreshState = false) => {
      if (showRefreshState) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const result = await getAgentTasks({
          status: statusFilter,
          taskType: taskTypeFilter,
          search,
          limit: 50,
        });
        setData(result);
        setLoadError(null);
      } catch (error) {
        console.error('Error fetching agent tasks:', error);
        setData({
          tasks: [],
          counts: {
            pending: 0,
            running: 0,
            completed: 0,
            failed: 0,
            retried: 0,
          },
        });
        setLoadError(error instanceof Error ? error.message : 'Failed to load agent runs');
        toast.error('Failed to load agent runs');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [search, statusFilter, taskTypeFilter]
  );

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (selectedTask) {
      setRescheduleAt(toDateTimeLocalValue(selectedTask.scheduledAt));
    } else {
      setRescheduleAt('');
    }
  }, [selectedTask]);

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      if (!selectedTask) {
        setSelectedTaskHistory(null);
        setHistoryError(null);
        return;
      }

      setIsHistoryLoading(true);
      try {
        const history = await getAgentTaskHistory(selectedTask.id);
        if (active) {
          setSelectedTaskHistory(history);
          setHistoryError(null);
        }
      } catch (error) {
        console.error('Error fetching task history:', error);
        if (active) {
          setSelectedTaskHistory(null);
          setHistoryError(error instanceof Error ? error.message : 'Failed to load task history');
        }
      } finally {
        if (active) {
          setIsHistoryLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      active = false;
    };
  }, [selectedTask]);

  const handleRunNow = async () => {
    setIsRunningNow(true);
    try {
      const result = await runAgentTasks(25);
      if (result.total === 0) {
        toast.message('No pending agent tasks were ready to run');
      } else if (result.failed > 0) {
        toast.success(
          `Processed ${result.completed} task${result.completed === 1 ? '' : 's'} with ${result.failed} failure${result.failed === 1 ? '' : 's'}`
        );
      } else {
        toast.success(`Processed ${result.completed} agent task${result.completed === 1 ? '' : 's'}`);
      }
      await fetchTasks(true);
    } catch (error) {
      console.error('Error running agent tasks:', error);
      toast.error('Failed to run agent tasks');
    } finally {
      setIsRunningNow(false);
    }
  };

  const updateTaskInState = useCallback((task: AgentTaskRecord) => {
    setData((current) => {
      if (!current) return current;

      return {
        ...current,
        tasks: current.tasks.map((item) => (item.id === task.id ? task : item)),
      };
    });
    setSelectedTask(task);
    setSelectedTaskHistory((current) =>
      current
        ? {
            ...current,
            task,
          }
        : current
    );
  }, []);

  const applyFilters = useCallback(() => {
    const nextSearch = draftSearch.trim();
    const filtersChanged =
      draftStatusFilter !== statusFilter ||
      draftTaskTypeFilter !== taskTypeFilter ||
      nextSearch !== search;

    setStatusFilter(draftStatusFilter);
    setTaskTypeFilter(draftTaskTypeFilter);
    setSearch(nextSearch);
    setSelectedTask(null);

    if (!filtersChanged) {
      void fetchTasks(true);
    }
  }, [
    draftSearch,
    draftStatusFilter,
    draftTaskTypeFilter,
    fetchTasks,
    search,
    statusFilter,
    taskTypeFilter,
  ]);

  const resetFilters = useCallback(() => {
    const filtersChanged = statusFilter !== 'all' || taskTypeFilter !== 'all' || search !== '';

    setDraftStatusFilter('all');
    setDraftTaskTypeFilter('all');
    setDraftSearch('');
    setStatusFilter('all');
    setTaskTypeFilter('all');
    setSearch('');
    setSelectedTask(null);

    if (!filtersChanged) {
      void fetchTasks(true);
    }
  }, [fetchTasks, search, statusFilter, taskTypeFilter]);

  const handleRetryTask = async () => {
    if (!selectedTask) return;

    setTaskActionLoading('retry');
    try {
      const response = await retryAgentTask(selectedTask.id);
      updateTaskInState(response.task);
      toast.success('Task moved back to the pending queue');
      await fetchTasks(true);
    } catch (error) {
      console.error('Error retrying agent task:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to retry task');
    } finally {
      setTaskActionLoading(null);
    }
  };

  const handleRescheduleTask = async () => {
    if (!selectedTask) return;

    if (!rescheduleAt) {
      toast.error('Choose a new schedule time first');
      return;
    }

    setTaskActionLoading('reschedule');
    try {
      const scheduledAtIso = new Date(rescheduleAt).toISOString();
      const response = await rescheduleAgentTask(selectedTask.id, scheduledAtIso);
      updateTaskInState(response.task);
      toast.success('Task rescheduled successfully');
      await fetchTasks(true);
    } catch (error) {
      console.error('Error rescheduling agent task:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reschedule task');
    } finally {
      setTaskActionLoading(null);
    }
  };

  const counts = data?.counts;

  return (
    <div className="space-y-6">
      <DashboardHeroCard
        title="Agent Runs"
        description="Inspect queued, completed, retried, and failed internal agent jobs created by Notion imports and scheduled processing."
        icon={<Bot className="h-8 w-8" />}
        gradientClassName="bg-gradient-to-r from-sky-600 via-cyan-500 to-teal-500"
        eyebrow="Admin Automation"
        eyebrowIcon={<Bot className="h-3.5 w-3.5" />}
        aside={
          <>
            <DashboardHeroActionButton
              tone="secondary"
              className="gap-2"
              onClick={() => void fetchTasks(true)}
              disabled={isRefreshing || isLoading}
            >
              {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </DashboardHeroActionButton>
            <DashboardHeroActionButton
              tone="primary"
              className="gap-2"
              onClick={handleRunNow}
              disabled={isRunningNow}
            >
              {isRunningNow ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
              Run Pending Now
            </DashboardHeroActionButton>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Pending" value={counts?.pending} tone="amber" icon={Clock3} isLoading={isLoading} />
        <SummaryCard label="Running" value={counts?.running} tone="blue" icon={Loader2} isLoading={isLoading} spin />
        <SummaryCard label="Completed" value={counts?.completed} tone="green" icon={CheckCircle2} isLoading={isLoading} />
        <SummaryCard label="Failed" value={counts?.failed} tone="red" icon={XCircle} isLoading={isLoading} />
        <SummaryCard label="Retried" value={counts?.retried} tone="purple" icon={RotateCcw} isLoading={isLoading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Agent Jobs</CardTitle>
          <CardDescription>Search task payloads, results, and failures. Apply filters to refresh the recent jobs table below.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1.2fr_180px_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  applyFilters();
                }
              }}
              placeholder="Search payload, result, or error"
              className="pl-9"
            />
          </div>
          <select
            value={draftStatusFilter}
            onChange={(event) => setDraftStatusFilter(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={draftTaskTypeFilter}
            onChange={(event) => setDraftTaskTypeFilter(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {TASK_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button variant="outline" onClick={applyFilters} disabled={isRefreshing}>
              Apply Filters
            </Button>
            <Button variant="ghost" onClick={resetFilters} disabled={isRefreshing}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Agent Jobs</CardTitle>
          <CardDescription>
            {search || statusFilter !== 'all' || taskTypeFilter !== 'all'
              ? 'Showing the 50 most recent jobs that match your applied filters.'
              : 'Showing the 50 most recent jobs in this workspace.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadError ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <p className="font-medium">Agent runs could not be loaded.</p>
              <p className="mt-1 text-red-900/80">{loadError}</p>
            </div>
          ) : null}

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : data && data.tasks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Last Update</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{formatTaskType(task.taskType)}</p>
                        <p className="text-xs text-muted-foreground">{task.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadgeClassName(task.status)}>
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {task.retryCount} / {task.maxRetries}
                        </p>
                        {task.retryCount > 0 && (
                          <p className="text-xs text-muted-foreground">Retried</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTimestamp(task.scheduledAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedTask(task)}>
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="font-medium">No agent jobs found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try broadening your filters or run pending tasks to populate this view.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={Boolean(selectedTask)} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <SheetContent className="w-full sm:max-w-2xl">
          {selectedTask && (
            <>
              <SheetHeader>
                <SheetTitle>{formatTaskType(selectedTask.taskType)}</SheetTitle>
                <SheetDescription>
                  {selectedTask.id} · {selectedTask.status}
                </SheetDescription>
              </SheetHeader>

              <ScrollArea className="mt-6 h-[calc(100vh-8rem)] pr-4">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Task Actions</CardTitle>
                      <CardDescription>Retry failed work immediately or move pending and failed jobs to a new schedule time.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-3">
                        <Button
                          onClick={handleRetryTask}
                          disabled={selectedTask.status !== 'failed' || taskActionLoading !== null}
                          className="gap-2"
                        >
                          {taskActionLoading === 'retry' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                          Retry Failed Task
                        </Button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                        <Input
                          type="datetime-local"
                          value={rescheduleAt}
                          onChange={(event) => setRescheduleAt(event.target.value)}
                          disabled={selectedTask.status === 'running' || selectedTask.status === 'completed' || taskActionLoading !== null}
                        />
                        <Button
                          variant="outline"
                          onClick={handleRescheduleTask}
                          disabled={
                            selectedTask.status === 'running' ||
                            selectedTask.status === 'completed' ||
                            taskActionLoading !== null
                          }
                          className="gap-2"
                        >
                          {taskActionLoading === 'reschedule' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Clock3 className="h-4 w-4" />
                          )}
                          Reschedule Task
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-3 md:grid-cols-2">
                    <DetailCard label="Status" value={selectedTask.status} />
                    <DetailCard label="Retries" value={`${selectedTask.retryCount} / ${selectedTask.maxRetries}`} />
                    <DetailCard label="Scheduled" value={formatTimestamp(selectedTask.scheduledAt)} />
                    <DetailCard label="Updated" value={formatTimestamp(selectedTask.updatedAt)} />
                    <DetailCard label="Started" value={formatNullableTimestamp(selectedTask.startedAt)} />
                    <DetailCard label="Completed" value={formatNullableTimestamp(selectedTask.completedAt)} />
                  </div>

                  {selectedTask.errorMessage && (
                    <Card className="border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20">
                      <CardHeader>
                        <CardTitle className="text-base text-red-700 dark:text-red-300">Latest Error</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-red-800 dark:text-red-200">{selectedTask.errorMessage}</p>
                      </CardContent>
                    </Card>
                  )}

                  <CodePanel title="Payload" value={selectedTask.payload} />
                  <CodePanel title="Result" value={selectedTask.result} />

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Attempt Timeline</CardTitle>
                      <CardDescription>Execution attempts and admin actions for this job.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isHistoryLoading ? (
                        <div className="space-y-3">
                          <Skeleton className="h-16 w-full" />
                          <Skeleton className="h-16 w-full" />
                        </div>
                      ) : historyError ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                          <p className="font-medium">Task history could not be loaded.</p>
                          <p className="mt-1 text-red-900/80">{historyError}</p>
                        </div>
                      ) : selectedTaskHistory && selectedTaskHistory.timeline.length > 0 ? (
                        <div className="space-y-3">
                          {selectedTaskHistory.timeline.map((item) => (
                            <div key={item.id} className="rounded-xl border p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={timelineBadgeClassName(item.status)}>
                                      {item.type === 'attempt' ? 'Attempt' : 'Event'}
                                    </Badge>
                                    <span className="font-medium">{item.title}</span>
                                  </div>
                                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatTimestamp(item.occurredAt)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No attempt history recorded yet.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  icon: Icon,
  isLoading,
  spin = false,
}: {
  label: string;
  value?: number;
  tone: 'amber' | 'blue' | 'green' | 'red' | 'purple';
  icon: typeof Clock3;
  isLoading: boolean;
  spin?: boolean;
}) {
  const styles = {
    amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300',
    blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-300',
    green: 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/20 dark:text-green-300',
    red: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300',
    purple: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950/20 dark:text-purple-300',
  };

  return (
    <Card className={styles[tone]}>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {isLoading ? (
            <Skeleton className="mt-2 h-8 w-16" />
          ) : (
            <p className="mt-2 text-3xl font-bold">{value ?? 0}</p>
          )}
        </div>
        <Icon className={`h-6 w-6 ${spin ? 'animate-spin' : ''}`} />
      </CardContent>
    </Card>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 text-sm font-medium">{value}</p>
      </CardContent>
    </Card>
  );
}

function CodePanel({ title, value }: { title: string; value?: string | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
          <code>{prettyPrintJson(value)}</code>
        </pre>
      </CardContent>
    </Card>
  );
}

function prettyPrintJson(value?: string | null) {
  if (!value) {
    return 'No data';
  }

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function formatTaskType(taskType: string) {
  switch (taskType) {
    case 'classify_ledger_entry':
      return 'Classify Ledger Entry';
    case 'recalculate_goal_progress':
      return 'Recalculate Goal Progress';
    case 'draft_monthly_report':
      return 'Draft Monthly Report';
    default:
      return taskType.replace(/_/g, ' ');
  }
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

function formatNullableTimestamp(value?: string | null) {
  return value ? formatTimestamp(value) : 'Not recorded';
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function statusBadgeClassName(status: AgentTaskRecord['status']) {
  switch (status) {
    case 'pending':
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300';
    case 'running':
      return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-300';
    case 'completed':
      return 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/20 dark:text-green-300';
    case 'failed':
      return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300';
    default:
      return '';
  }
}

function timelineBadgeClassName(status: 'pending' | 'running' | 'completed' | 'failed' | 'info') {
  switch (status) {
    case 'pending':
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300';
    case 'running':
      return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-300';
    case 'completed':
      return 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/20 dark:text-green-300';
    case 'failed':
      return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300';
    case 'info':
      return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-300';
    default:
      return '';
  }
}
