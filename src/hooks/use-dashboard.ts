// Eco-Loom Custom Hook for Dashboard Data - Production Ready

'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  DashboardMetrics,
  EmissionsByCategory,
  MonthlyEmissions,
  DepartmentEmissions,
  ActivityFeedItem,
  GapAnalysis,
} from '@/lib/types';

export function useDashboard(companyId: string | null, departmentId?: string | null) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [emissionsByCategory, setEmissionsByCategory] = useState<EmissionsByCategory | null>(null);
  const [monthlyEmissions, setMonthlyEmissions] = useState<MonthlyEmissions[] | null>(null);
  const [departmentEmissions, setDepartmentEmissions] = useState<DepartmentEmissions[] | null>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[] | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Ensure we only render on client after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({
      companyId,
    });

    if (departmentId) {
      params.set('departmentId', departmentId);
    }

    try {
      const [metricsRes, emissionsRes, monthlyRes, deptRes, activityRes, gapRes] = await Promise.all([
        fetch(`/api/dashboard/metrics?${params.toString()}`, { cache: 'no-store' }).catch(() => null),
        fetch(`/api/dashboard/emissions-by-category?${params.toString()}`, { cache: 'no-store' }).catch(() => null),
        fetch(`/api/dashboard/monthly-emissions?${params.toString()}&months=12`, { cache: 'no-store' }).catch(() => null),
        fetch(`/api/dashboard/department-emissions?${params.toString()}`, { cache: 'no-store' }).catch(() => null),
        fetch(`/api/dashboard/activity-feed?${params.toString()}&limit=10`, { cache: 'no-store' }).catch(() => null),
        fetch(`/api/dashboard/gap-analysis?${params.toString()}`, { cache: 'no-store' }).catch(() => null),
      ]);

      if (metricsRes?.ok) {
        const data = await metricsRes.json();
        if (data.totalCo2eThisMonth !== undefined) {
          setMetrics(data);
        } else {
          setMetrics(null);
        }
      } else {
        setMetrics(null);
      }

      if (emissionsRes?.ok) {
        const data = await emissionsRes.json();
        if (data.scope1 !== undefined) {
          setEmissionsByCategory(data);
        } else {
          setEmissionsByCategory(null);
        }
      } else {
        setEmissionsByCategory(null);
      }

      if (monthlyRes?.ok) {
        const data = await monthlyRes.json();
        if (Array.isArray(data) && data.length > 0) {
          setMonthlyEmissions(data);
        } else {
          setMonthlyEmissions([]);
        }
      } else {
        setMonthlyEmissions([]);
      }

      if (deptRes?.ok) {
        const data = await deptRes.json();
        if (Array.isArray(data) && data.length > 0) {
          setDepartmentEmissions(data);
        } else {
          setDepartmentEmissions([]);
        }
      } else {
        setDepartmentEmissions([]);
      }

      if (activityRes?.ok) {
        const data = await activityRes.json();
        if (Array.isArray(data)) {
          setActivityFeed(data);
        } else {
          setActivityFeed([]);
        }
      } else {
        setActivityFeed([]);
      }

      if (gapRes?.ok) {
        const data = await gapRes.json();
        if (data.goalsAtRisk !== undefined) {
          setGapAnalysis(data);
        } else {
          setGapAnalysis(null);
        }
      } else {
        setGapAnalysis(null);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');

      setMetrics(null);
      setEmissionsByCategory(null);
      setMonthlyEmissions([]);
      setDepartmentEmissions([]);
      setActivityFeed([]);
      setGapAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, departmentId]);

  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [fetchData, mounted]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    metrics,
    emissionsByCategory,
    monthlyEmissions,
    departmentEmissions,
    activityFeed,
    gapAnalysis,
    isLoading,
    error,
    refresh,
    mounted,
  };
}
