'use client';

import type { ComponentProps, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardHeroCardProps {
  title: string;
  description?: ReactNode;
  icon: ReactNode;
  gradientClassName: string;
  eyebrow?: string;
  eyebrowIcon?: ReactNode;
  aside?: ReactNode;
  asideClassName?: string;
}

type DashboardHeroActionButtonProps = ComponentProps<typeof Button> & {
  tone?: 'primary' | 'secondary';
};

export const dashboardHeroControlSurfaceClassName =
  'rounded-2xl border border-white/15 bg-white/10 p-1 shadow-lg shadow-emerald-900/10 backdrop-blur';

export const dashboardHeroTabsListClassName =
  'h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0 md:w-auto md:justify-end';

export const dashboardHeroTabsTriggerClassName =
  'h-10 rounded-xl border border-transparent bg-transparent px-3 text-sm font-medium text-white/80 shadow-none hover:bg-white/12 hover:text-white data-[state=active]:border-white/20 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm data-[state=active]:hover:bg-white';

export function DashboardHeroActionButton({
  tone = 'secondary',
  className,
  size = 'lg',
  variant = 'secondary',
  ...props
}: DashboardHeroActionButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        'h-10 rounded-xl border px-4 font-medium shadow-sm backdrop-blur-sm transition-colors',
        tone === 'primary'
          ? 'border-white/70 bg-white text-slate-950 hover:bg-white/92 hover:text-slate-950 disabled:border-white/40 disabled:bg-white/65 disabled:text-slate-700'
          : 'border-white/20 bg-white/12 text-white hover:bg-white/18 hover:text-white disabled:border-white/10 disabled:bg-white/10 disabled:text-white/70',
        className
      )}
      {...props}
    />
  );
}

export function DashboardHeroCard({
  title,
  description,
  icon,
  eyebrow,
  eyebrowIcon,
  aside,
  asideClassName,
}: DashboardHeroCardProps) {
  return (
    <Card
      className={cn(
        'overflow-hidden border-0 bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 text-white shadow-xl'
      )}
    >
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 text-white">
            <div className="rounded-xl bg-white/20 p-3">{icon}</div>
            <div className="space-y-2">
              {eyebrow && (
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                  {eyebrowIcon}
                  {eyebrow}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold">{title}</h2>
                {description ? (
                  <div className="max-w-2xl text-sm text-white/80">{description}</div>
                ) : null}
              </div>
            </div>
          </div>
          {aside ? (
            <div className={cn('flex flex-wrap gap-2', asideClassName)}>
              {aside}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
