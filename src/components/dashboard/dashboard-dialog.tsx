'use client';

import type { ComponentProps, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type DashboardDialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'wide';

const dashboardDialogSizeClassNames: Record<DashboardDialogSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  wide: 'sm:max-w-6xl xl:max-w-7xl',
};

interface DashboardDialogContentProps extends ComponentProps<typeof DialogContent> {
  size?: DashboardDialogSize;
}

interface DashboardDialogIntroProps {
  badge?: string;
  badgeIcon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  descriptionClassName?: string;
}

export function DashboardDialogContentShell({
  className,
  size = 'md',
  children,
  ...props
}: DashboardDialogContentProps) {
  return (
    <DialogContent
      className={cn(
        'max-h-[90vh] gap-0 overflow-y-auto rounded-[28px] border border-emerald-100 bg-white p-0 shadow-2xl shadow-emerald-100/60',
        dashboardDialogSizeClassNames[size],
        className
      )}
      {...props}
    >
      {children}
    </DialogContent>
  );
}

export function DashboardDialogIntro({
  badge,
  badgeIcon: BadgeIcon,
  title,
  description,
  className,
  descriptionClassName,
}: DashboardDialogIntroProps) {
  return (
    <div
      className={cn(
        'border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-lime-50/70 px-6 py-6 sm:px-7',
        className
      )}
    >
      <DialogHeader className="space-y-4 text-left">
        {badge && (
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            {BadgeIcon ? <BadgeIcon className="h-3.5 w-3.5" /> : null}
            {badge}
          </div>
        )}
        <div className="space-y-2">
          <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-950">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription
              className={cn(
                'max-w-3xl text-sm leading-6 text-slate-600',
                descriptionClassName
              )}
            >
              {description}
            </DialogDescription>
          ) : null}
        </div>
      </DialogHeader>
    </div>
  );
}

export function DashboardDialogBody({
  className,
  ...props
}: ComponentProps<'div'>) {
  return <div className={cn('space-y-5 p-6 sm:p-7', className)} {...props} />;
}
