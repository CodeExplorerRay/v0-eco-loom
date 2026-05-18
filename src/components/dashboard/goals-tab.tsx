// Goals Tab Component - Production Ready with Full API Integration

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DashboardHeroActionButton,
  DashboardHeroCard,
} from '@/components/dashboard/dashboard-hero-card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DashboardDialogBody,
  DashboardDialogContentShell,
  DashboardDialogIntro,
} from '@/components/dashboard/dashboard-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Target, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Leaf,
  Zap,
  Recycle,
  Droplets,
  Globe,
  Edit,
  Trash2,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { buildGapAnalysisGoalItems } from '@/lib/gap-analysis';
import type {
  AuditCenterRequest,
  SustainabilityGoal,
  GoalStatus,
  GoalType,
  Department,
} from '@/lib/types';

interface GoalsTabProps {
  companyId: string;
  selectedFacilityId?: string | null;
  onOpenAuditCenter?: (filters: AuditCenterRequest['filters'], title?: string) => void;
}

const getGoalIcon = (type: GoalType) => {
  const icons: Record<GoalType, React.ReactNode> = {
    emission_reduction: <TrendingDown className="h-5 w-5" />,
    renewable_energy: <Zap className="h-5 w-5" />,
    waste_reduction: <Recycle className="h-5 w-5" />,
    water_conservation: <Droplets className="h-5 w-5" />,
    carbon_neutral: <Globe className="h-5 w-5" />,
    other: <Leaf className="h-5 w-5" />,
  };
  return icons[type];
};

const getStatusInfo = (status: GoalStatus) => {
  const info: Record<GoalStatus, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
    on_track: {
      icon: <Clock className="h-4 w-4" />,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      border: 'border-yellow-300 dark:border-yellow-700',
    },
    at_risk: {
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'text-red-600',
      bg: 'bg-red-100 dark:bg-red-900/30',
      border: 'border-red-300 dark:border-red-700',
    },
    achieved: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: 'text-green-600',
      bg: 'bg-green-100 dark:bg-green-900/30',
      border: 'border-green-300 dark:border-green-700',
    },
    missed: {
      icon: <Minus className="h-4 w-4" />,
      color: 'text-gray-600',
      bg: 'bg-gray-100 dark:bg-gray-900/30',
      border: 'border-gray-300 dark:border-gray-700',
    },
  };
  return info[status];
};

const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: 'emission_reduction', label: 'Emission Reduction' },
  { value: 'renewable_energy', label: 'Renewable Energy' },
  { value: 'waste_reduction', label: 'Waste Reduction' },
  { value: 'water_conservation', label: 'Water Conservation' },
  { value: 'carbon_neutral', label: 'Carbon Neutrality' },
  { value: 'other', label: 'Other' },
];

export function GoalsTab({
  companyId,
  selectedFacilityId,
  onOpenAuditCenter,
}: GoalsTabProps) {
  const [goals, setGoals] = useState<SustainabilityGoal[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SustainabilityGoal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goalType: 'emission_reduction' as GoalType,
    targetValue: '',
    currentValue: '',
    targetUnit: '',
    baselineValue: '',
    baselineYear: '',
    targetYear: '',
    departmentId: selectedFacilityId || '',
  });

  // Fetch goals from API
  const fetchGoals = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setIsLoading(true);
    }
    try {
      const params = new URLSearchParams({ companyId });
      if (selectedFacilityId) {
        params.set('departmentId', selectedFacilityId);
      }

      const response = await fetch(`/api/goals?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Failed to fetch goals' }));
        throw new Error(payload.error || 'Failed to fetch goals');
      }

      const data = (await response.json()) as SustainabilityGoal[];
      setGoals(data);
      setLoadError(null);
    } catch (error) {
      console.error('Error fetching goals:', error);
      setGoals([]);
      setLoadError(error instanceof Error ? error.message : 'Failed to fetch goals');
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [companyId, selectedFacilityId]);

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch(`/api/departments?companyId=${companyId}`, { cache: 'no-store' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Failed to fetch facilities' }));
        throw new Error(payload.error || 'Failed to fetch facilities');
      }

      const data = (await response.json()) as Department[];
      setDepartments(data);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch facilities');
    }
  }, [companyId]);

  useEffect(() => {
    void fetchGoals();
    void fetchDepartments();
  }, [fetchGoals, fetchDepartments]);

  useEffect(() => {
    const refreshGoalsSilently = () => {
      void fetchGoals({ silent: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshGoalsSilently();
      }
    };

    window.addEventListener('focus', refreshGoalsSilently);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const intervalId = window.setInterval(refreshGoalsSilently, 60000);

    return () => {
      window.removeEventListener('focus', refreshGoalsSilently);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [fetchGoals]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      departmentId: prev.departmentId || selectedFacilityId || '',
    }));
  }, [selectedFacilityId]);

  // Create goal
  const handleCreateGoal = async () => {
    if (!formData.title || !formData.targetValue || !formData.targetUnit || !formData.targetYear) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          goalType: formData.goalType,
          targetValue: parseFloat(formData.targetValue),
          targetUnit: formData.targetUnit,
          baselineValue: formData.baselineValue ? parseFloat(formData.baselineValue) : null,
          baselineYear: formData.baselineYear ? parseInt(formData.baselineYear) : null,
          targetYear: parseInt(formData.targetYear),
          departmentId: formData.departmentId || null,
          companyId,
        }),
      });

      const createdGoal = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(createdGoal?.error || 'Failed to create goal');
      }

      await fetchGoals();
      setIsAddDialogOpen(false);
      resetForm();
      toast.success('Goal created successfully');
      if (createdGoal?.notionSync?.status === 'failed') {
        toast.error(createdGoal.notionSync.reason || 'The goal saved, but Notion auto-sync failed.');
      } else if (createdGoal?.notionSync?.status === 'skipped') {
        toast.info(createdGoal.notionSync.reason || 'The goal saved locally, but Notion auto-sync is unavailable right now.');
      }
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update goal
  const handleUpdateGoal = async () => {
    if (!selectedGoal) return;

    const parsedCurrentValue =
      formData.currentValue.trim().length > 0
        ? parseFloat(formData.currentValue)
        : selectedGoal.currentValue;

    if (!Number.isFinite(parsedCurrentValue)) {
      toast.error('Please enter a valid current value');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/goals/${selectedGoal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          currentValue: parsedCurrentValue,
        }),
      });

      const updatedGoal = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(updatedGoal?.error || 'Failed to update goal');
      }

      await fetchGoals();
      setIsEditDialogOpen(false);
      setSelectedGoal(null);
      resetForm();
      toast.success('Goal updated successfully');
      if (updatedGoal?.notionSync?.status === 'failed') {
        toast.error(updatedGoal.notionSync.reason || 'The goal updated, but Notion auto-sync failed.');
      } else if (updatedGoal?.notionSync?.status === 'skipped') {
        toast.info(updatedGoal.notionSync.reason || 'The goal updated locally, but Notion auto-sync is unavailable right now.');
      }
    } catch (error) {
      console.error('Error updating goal:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete goal
  const handleDeleteGoal = async () => {
    if (!selectedGoal) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/goals/${selectedGoal.id}`, {
        method: 'DELETE',
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to delete goal');
      }

      await fetchGoals();
      setIsDeleteDialogOpen(false);
      setSelectedGoal(null);
      toast.success('Goal deleted successfully');
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      goalType: 'emission_reduction',
      targetValue: '',
      currentValue: '',
      targetUnit: '',
      baselineValue: '',
      baselineYear: '',
      targetYear: '',
      departmentId: selectedFacilityId || '',
    });
  };

  const openEditDialog = (goal: SustainabilityGoal) => {
    setSelectedGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description || '',
      goalType: goal.goalType as GoalType,
      targetValue: goal.targetValue.toString(),
      currentValue: goal.currentValue.toString(),
      targetUnit: goal.targetUnit,
      baselineValue: goal.baselineValue?.toString() || '',
      baselineYear: goal.baselineYear?.toString() || '',
      targetYear: goal.targetYear.toString(),
      departmentId: goal.departmentId || '',
    });
    setIsEditDialogOpen(true);
  };

  const goalsByStatus = {
    on_track: goals.filter(g => g.status === 'on_track'),
    at_risk: goals.filter(g => g.status === 'at_risk'),
    achieved: goals.filter(g => g.status === 'achieved'),
    missed: goals.filter(g => g.status === 'missed'),
  };

  const gapRecommendations = useMemo(() => {
    const severityWeight = { high: 3, medium: 2, low: 1 } as const;

    return buildGapAnalysisGoalItems(goals)
      .sort((a, b) => {
        const severityDelta = severityWeight[b.severity] - severityWeight[a.severity];
        if (severityDelta !== 0) {
          return severityDelta;
        }

        return b.gapValue - a.gapValue;
      })
      .slice(0, 3);
  }, [goals]);

  return (
    <div className="space-y-5">
      <DashboardHeroCard
        title="Sustainability Goals"
        description="Track site and company targets with automatic progress updates and gap-based follow-up guidance."
        icon={<Target className="h-8 w-8" />}
        gradientClassName="bg-gradient-to-r from-teal-600 via-cyan-500 to-blue-500"
        eyebrow="Target Tracking"
        eyebrowIcon={<Target className="h-3.5 w-3.5" />}
        aside={
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <DashboardHeroActionButton tone="primary" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Goal
              </DashboardHeroActionButton>
            </DialogTrigger>
            <DashboardDialogContentShell size="lg">
                  <DashboardDialogIntro
                    badge="Goal setup"
                    title="Create Sustainability Goal"
                    description="Define a new environmental target for your organization"
                  />
                  <DashboardDialogBody className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Goal Title *</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Reduce emissions by 50%"
                        value={formData.title}
                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goalType">Goal Type *</Label>
                      <Select
                        value={formData.goalType}
                        onValueChange={(value: GoalType) => setFormData(prev => ({ ...prev, goalType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {GOAL_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="targetValue">Target Value *</Label>
                        <Input
                          id="targetValue"
                          type="number"
                          placeholder="0"
                          value={formData.targetValue}
                          onChange={e => setFormData(prev => ({ ...prev, targetValue: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="targetUnit">Unit *</Label>
                        <Input
                          id="targetUnit"
                          placeholder="kg CO2e"
                          value={formData.targetUnit}
                          onChange={e => setFormData(prev => ({ ...prev, targetUnit: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="targetYear">Target Year *</Label>
                        <Input
                          id="targetYear"
                          type="number"
                          placeholder="2030"
                          value={formData.targetYear}
                          onChange={e => setFormData(prev => ({ ...prev, targetYear: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">Facility / Site</Label>
                        <Select
                          value={formData.departmentId}
                          onValueChange={value => setFormData(prev => ({ ...prev, departmentId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select facility / site" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map(dept => (
                              <SelectItem key={dept.id} value={dept.id}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe the goal and how it will be achieved..."
                        value={formData.description}
                        onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </DashboardDialogBody>
                  <DialogFooter className="border-t border-emerald-100 px-6 pt-5 pb-6 sm:px-7 sm:pb-7">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateGoal} disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create Goal
                    </Button>
                  </DialogFooter>
            </DashboardDialogContentShell>
          </Dialog>
        }
      />

      {/* Status Summary */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border border-green-200/80 shadow-sm">
          <CardContent className="px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Achieved</p>
                <p className="text-2xl font-bold text-green-600">{goalsByStatus.achieved.length}</p>
              </div>
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-yellow-200/80 shadow-sm">
          <CardContent className="px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">On Track</p>
                <p className="text-2xl font-bold text-yellow-600">{goalsByStatus.on_track.length}</p>
              </div>
              <Clock className="h-6 w-6 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-red-200/80 shadow-sm">
          <CardContent className="px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">At Risk</p>
                <p className="text-2xl font-bold text-red-600">{goalsByStatus.at_risk.length}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Total Goals</p>
                <p className="text-2xl font-bold">{goals.length}</p>
              </div>
              <Target className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {loadError ? (
        <Card className="border-red-200 bg-red-50/80">
          <CardContent className="flex items-start gap-3 pt-6 text-sm text-red-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" />
            <div>
              <p className="font-medium">Goals data is unavailable right now.</p>
              <p className="mt-1 text-red-900/80">{loadError}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Goals Grid */}
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-1/2 mb-2" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-2 bg-muted rounded mb-4" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-12 bg-muted rounded" />
                  <div className="h-12 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <Card className="border-dashed border-emerald-200 bg-emerald-50/50">
          <CardContent className="py-12 text-center">
            <div className="mx-auto max-w-md space-y-3">
              <Target className="mx-auto h-10 w-10 text-emerald-500" />
              <h3 className="text-lg font-semibold text-emerald-950">No goals yet</h3>
              <p className="text-sm text-muted-foreground">
                Add a sustainability goal to start tracking progress and gap analysis recommendations for this workspace.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {goals.map((goal) => {
            const statusInfo = getStatusInfo(goal.status as GoalStatus);
            return (
              <Card 
                key={goal.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${statusInfo.border} border-l-4 shadow-sm`}
                onClick={() => setSelectedGoal(goal)}
              >
                <CardHeader className="space-y-3 pb-0 pt-4">
                  <div className="flex items-start justify-between">
                    <div className={`rounded-lg p-2 ${statusInfo.bg}`}>
                      {getGoalIcon(goal.goalType as GoalType)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge className={`${statusInfo.bg} ${statusInfo.color} text-[11px]`}>
                        {statusInfo.icon}
                        <span className="ml-1 capitalize">{goal.status.replace('_', ' ')}</span>
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base leading-snug">{goal.title}</CardTitle>
                    <CardDescription className="line-clamp-2 text-sm">{goal.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 pb-4">
                  <div className="space-y-3">
                    {/* Progress */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="uppercase tracking-[0.14em] text-muted-foreground">Progress</span>
                        <span className="font-medium">{goal.progressPercent.toFixed(1)}%</span>
                      </div>
                      <Progress 
                        value={goal.progressPercent} 
                        className={`h-2 ${goal.status === 'achieved' ? '[&>div]:bg-green-500' : goal.status === 'at_risk' ? '[&>div]:bg-red-500' : '[&>div]:bg-yellow-500'}`}
                      />
                    </div>
                    
                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-muted px-3 py-2.5">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Current</p>
                        <p className="font-medium">{goal.currentValue.toLocaleString()} {goal.targetUnit}</p>
                      </div>
                      <div className="rounded-lg bg-muted px-3 py-2.5">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Target</p>
                        <p className="font-medium">{goal.targetValue.toLocaleString()} {goal.targetUnit}</p>
                      </div>
                    </div>
                    
                    {/* Facility & Year */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {goal.department ? (
                        <Badge variant="outline">{goal.department.code}</Badge>
                      ) : (
                        <span>Company-wide</span>
                      )}
                      <span>by {goal.targetYear}</span>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 flex-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(goal);
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      {goal.notionPageId ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 flex-1 text-xs text-purple-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://notion.so/${goal.notionPageId?.replace(/-/g, '')}`, '_blank');
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      ) : (
                        <div className="flex h-8 flex-1 items-center justify-center rounded-md border border-emerald-100 bg-emerald-50/70 px-3 text-[11px] font-medium text-emerald-700">
                          Auto-sync pending
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Gap Analysis Recommendations */}
      <Card className="border-emerald-200 bg-white/90">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-600" />
            Gap Analysis Recommendations
          </CardTitle>
          <CardDescription>
            Priority follow-up based on current goal gaps, progress, and target status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {gapRecommendations.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-900">
                All open goals are currently aligned with their targets. This card will highlight the next gap to close
                as progress changes.
              </div>
            ) : (
              gapRecommendations.map((item) => (
                <div
                  key={`${item.goal}-${item.department ?? 'company-wide'}`}
                  className={`rounded-lg border px-4 py-3 ${
                    item.severity === 'high'
                      ? 'border-red-200 bg-red-50'
                      : item.severity === 'medium'
                        ? 'border-yellow-200 bg-yellow-50'
                        : 'border-emerald-200 bg-emerald-50'
                  }`}
                >
                    <div className="flex items-start gap-3">
                    {item.severity === 'high' ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-red-500" />
                    ) : item.status === 'on_track' ? (
                      <Clock className="mt-0.5 h-4 w-4 text-yellow-500" />
                    ) : (
                      <Target className="mt-0.5 h-4 w-4 text-emerald-600" />
                    )}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`font-medium ${
                            item.severity === 'high'
                              ? 'text-red-700'
                              : item.severity === 'medium'
                                ? 'text-yellow-800'
                                : 'text-emerald-800'
                          }`}
                        >
                          {item.goal}
                        </p>
                        <Badge variant="outline" className="bg-white/70">
                          {item.department}
                        </Badge>
                      </div>
                      <p
                        className={`text-sm ${
                          item.severity === 'high'
                            ? 'text-red-700/90'
                            : item.severity === 'medium'
                              ? 'text-yellow-800/90'
                              : 'text-emerald-800/90'
                        }`}
                      >
                        {item.summary}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
            {goalsByStatus.achieved.length > 0 ? (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700">Completed goals</p>
                    <p className="mt-1 text-sm text-green-700/90">
                      {goalsByStatus.achieved.length} goal{goalsByStatus.achieved.length === 1 ? '' : 's'} already met
                      the target. Use them as proof points in reporting and keep the operating controls in place.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Goal Detail Dialog */}
      <Dialog open={!!selectedGoal && !isEditDialogOpen && !isDeleteDialogOpen} onOpenChange={() => setSelectedGoal(null)}>
        <DashboardDialogContentShell size="lg">
          <DashboardDialogIntro
            badge="Goal detail"
            title={selectedGoal?.title || 'Goal detail'}
            description={selectedGoal?.description}
          />
          {selectedGoal && (
            <DashboardDialogBody className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-green-600">{selectedGoal.progressPercent.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Complete</p>
                </div>
              </div>
              <Progress value={selectedGoal.progressPercent} className="h-3" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-muted-foreground">Baseline ({selectedGoal.baselineYear || 'N/A'})</p>
                  <p className="font-bold">{selectedGoal.baselineValue?.toLocaleString() || 'N/A'} {selectedGoal.targetUnit}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-muted-foreground">Target ({selectedGoal.targetYear})</p>
                  <p className="font-bold">{selectedGoal.targetValue.toLocaleString()} {selectedGoal.targetUnit}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {onOpenAuditCenter && (
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => {
                      onOpenAuditCenter(
                        {
                          feature: 'goals',
                          entityId: selectedGoal.id,
                        },
                        selectedGoal.title
                      );
                      setSelectedGoal(null);
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in Audit Center
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2"
                  onClick={() => {
                    setFormData({
                      title: selectedGoal.title,
                      description: selectedGoal.description || '',
                      goalType: selectedGoal.goalType as GoalType,
                      targetValue: selectedGoal.targetValue.toString(),
                      currentValue: selectedGoal.currentValue.toString(),
                      targetUnit: selectedGoal.targetUnit,
                      baselineValue: selectedGoal.baselineValue?.toString() || '',
                      baselineYear: selectedGoal.baselineYear?.toString() || '',
                      targetYear: selectedGoal.targetYear.toString(),
                      departmentId: selectedGoal.departmentId || '',
                    });
                    setIsEditDialogOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2"
                  onClick={() => {
                    if (selectedGoal.notionPageId) {
                      // Open the specific Notion page
                      window.open(`https://notion.so/${selectedGoal.notionPageId.replace(/-/g, '')}`, '_blank');
                    } else {
                      // Open Notion workspace
                      window.open('https://notion.so', '_blank');
                    }
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  View in Notion
                </Button>
              </div>
            </DashboardDialogBody>
          )}
        </DashboardDialogContentShell>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DashboardDialogContentShell size="lg">
          <DashboardDialogIntro
            badge="Goal update"
            title="Edit Goal"
            description="Update the goal details"
          />
          <DashboardDialogBody className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-value">Current Value</Label>
              <Input
                id="edit-value"
                type="number"
                value={formData.currentValue}
                onChange={e => setFormData(prev => ({ ...prev, currentValue: e.target.value }))}
              />
            </div>
          </DashboardDialogBody>
          <DialogFooter className="border-t border-emerald-100 px-6 pt-5 pb-6 sm:px-7 sm:pb-7">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateGoal} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DashboardDialogContentShell>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DashboardDialogContentShell size="md">
          <DashboardDialogIntro
            badge="Goal removal"
            title="Delete Goal"
            description="Are you sure you want to delete this goal? This action cannot be undone."
          />
          <DashboardDialogBody className="space-y-4">
            {selectedGoal ? (
              <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-900">
                <p className="font-medium">{selectedGoal.title}</p>
                <p className="mt-1 text-red-900/80">
                  Target {selectedGoal.targetValue.toLocaleString()} {selectedGoal.targetUnit} by {selectedGoal.targetYear}
                </p>
              </div>
            ) : null}
          </DashboardDialogBody>
          <DialogFooter className="border-t border-emerald-100 px-6 pt-5 pb-6 sm:px-7 sm:pb-7">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteGoal} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DashboardDialogContentShell>
      </Dialog>
    </div>
  );
}
