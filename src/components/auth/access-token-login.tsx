'use client';

import Link from 'next/link';
import { FormEvent, ReactNode, useState } from 'react';
import {
  type LucideIcon,
  AlertCircle,
  ArrowLeft,
  Factory,
  Leaf,
  MapPin,
  ShieldCheck,
  Wind,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type SessionState = {
  authenticated: boolean;
  companyId?: string;
  role?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
};

type AuthResponse = SessionState & {
  error?: string;
  retryAfterSeconds?: number;
};

const loginSceneMetrics: Array<{
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  cardClassName: string;
}> = [
  {
    value: '6',
    label: 'facilities mapped',
    description: 'Site-level carbon tracking',
    icon: MapPin,
    iconClassName: 'text-emerald-700',
    cardClassName: 'border-emerald-200/80 bg-white/78',
  },
  {
    value: '3',
    label: 'scopes connected',
    description: 'From source data to disclosure',
    icon: Leaf,
    iconClassName: 'text-lime-700',
    cardClassName: 'border-lime-200/80 bg-lime-50/80',
  },
  {
    value: '24/7',
    label: 'ops visibility',
    description: 'Audit-ready sustainability flow',
    icon: Wind,
    iconClassName: 'text-teal-700',
    cardClassName: 'border-teal-200/80 bg-teal-50/75',
  },
];

const footprintSignals = ['Energy', 'Travel', 'Freight', 'Waste', 'Water'];

interface AccessTokenLoginProps {
  title?: string;
  description?: string;
  submitLabel?: string;
  backHref?: string;
  backLabel?: string;
  helperText?: string;
  alertMessage?: string | null;
  redirectHref?: string;
  onSuccess?: (session: SessionState) => void;
  actions?: ReactNode;
}

export function AccessTokenLogin({
  title = 'Protected Workspace',
  description = 'Enter your work email and Eco-Loom access token to unlock the dashboard and API.',
  submitLabel = 'Unlock workspace',
  backHref = '/',
  backLabel = 'Back to site',
  helperText = 'Use the work email and access token assigned to your Eco-Loom workspace. Access tokens are case-sensitive.',
  alertMessage = null,
  redirectHref,
  onSuccess,
  actions,
}: AccessTokenLoginProps) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setIsRedirecting(false);
    setError(null);
    let isNavigatingAway = false;

    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      });

      const data = (await response.json()) as AuthResponse;
      if (!response.ok) {
        if (response.status === 429 && typeof data.retryAfterSeconds === 'number') {
          const retryAfterSeconds = Math.max(1, Math.round(data.retryAfterSeconds));
          const retryAfterMinutes = retryAfterSeconds >= 60 ? Math.ceil(retryAfterSeconds / 60) : null;
          setError(
            retryAfterMinutes
              ? `${data.error || 'Too many login attempts.'} Try again in about ${retryAfterMinutes} minute${retryAfterMinutes === 1 ? '' : 's'}.`
              : `${data.error || 'Too many login attempts.'} Try again in about ${retryAfterSeconds} second${retryAfterSeconds === 1 ? '' : 's'}.`
          );
          return;
        }

        setError(data.error || 'Authentication failed');
        return;
      }

      setEmail('');
      setToken('');
      onSuccess?.(data);

      if (redirectHref && typeof window !== 'undefined') {
        isNavigatingAway = true;
        setIsRedirecting(true);
        window.location.replace(redirectHref);
        return;
      }
    } catch {
      setError('Authentication failed');
    } finally {
      if (!isNavigatingAway) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden px-4 py-8 text-slate-900 sm:px-6 lg:px-8"
      style={{
        backgroundImage:
          'radial-gradient(circle at 12% 18%, rgba(52, 211, 153, 0.28), transparent 28%), radial-gradient(circle at 88% 10%, rgba(163, 230, 53, 0.22), transparent 22%), linear-gradient(135deg, #f7fcf8 0%, #eefbf2 34%, #dbf6e6 68%, #f0fbf5 100%)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            'linear-gradient(rgba(21, 128, 61, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(21, 128, 61, 0.06) 1px, transparent 1px)',
          backgroundSize: '84px 84px',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.75), transparent)',
        }}
      />
      <div className="pointer-events-none absolute -left-20 top-24 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-6 right-0 h-80 w-80 rounded-full bg-lime-200/25 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center">
        <div className="grid w-full items-stretch gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,440px)] lg:gap-8">
          <section className="relative overflow-hidden rounded-[2rem] border border-emerald-200/80 bg-white/58 p-6 shadow-[0_35px_120px_-45px_rgba(22,101,52,0.35)] backdrop-blur-xl sm:p-8 lg:p-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 18% 22%, rgba(167, 243, 208, 0.68), transparent 24%), radial-gradient(circle at 78% 14%, rgba(236, 253, 245, 0.92), transparent 28%), linear-gradient(160deg, rgba(236, 253, 245, 0.96) 0%, rgba(209, 250, 229, 0.88) 48%, rgba(240, 253, 244, 0.9) 100%)',
              }}
            />
            <div
              className="absolute inset-0 opacity-35"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(16, 185, 129, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.08) 1px, transparent 1px)',
                backgroundSize: '64px 64px',
              }}
            />

            <div className="relative z-10 flex h-full flex-col justify-between gap-8">
              <div className="max-w-2xl space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/82 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-800 shadow-sm">
                  <Leaf className="h-3.5 w-3.5" />
                  Carbon operations cockpit
                </div>
                <div className="space-y-4">
                  <h2 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                    Step into a cleaner view of every footprint stream.
                  </h2>
                  <p className="max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
                    Eco-Loom brings facilities, activity data, factor coverage, and reporting readiness into one
                    calm sustainability workspace so teams can act before carbon risk compounds.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {loginSceneMetrics.map((metric) => {
                    const Icon = metric.icon;

                    return (
                      <div
                        key={metric.label}
                        className={`rounded-2xl border p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] ${metric.cardClassName}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-2xl font-semibold text-slate-950">{metric.value}</p>
                            <p className="mt-1 text-sm font-medium text-slate-800">{metric.label}</p>
                          </div>
                          <div className="rounded-2xl bg-white/85 p-2 shadow-sm">
                            <Icon className={`h-5 w-5 ${metric.iconClassName}`} />
                          </div>
                        </div>
                        <p className="mt-3 text-xs leading-relaxed text-slate-600">{metric.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="relative h-[300px] overflow-hidden rounded-[1.75rem] border border-emerald-200/70 bg-white/50 shadow-inner sm:h-[340px]">
                <div className="absolute left-10 top-8 h-24 w-24 rounded-full bg-lime-200/85 blur-2xl" />
                <div className="absolute right-12 top-10 h-16 w-16 rounded-full bg-emerald-200/90 blur-xl" />
                <div className="absolute inset-x-10 top-8 h-24 rounded-full border border-emerald-300/40" />
                <div className="absolute inset-x-16 top-14 h-24 rounded-full border border-emerald-300/25" />

                {footprintSignals.map((signal, index) => (
                  <div
                    key={signal}
                    className="absolute rounded-full border border-white/70 bg-white/88 px-3 py-1 text-xs font-medium text-slate-700 shadow-md"
                    style={{
                      top: `${22 + index * 11}%`,
                      left: `${12 + (index % 3) * 24}%`,
                    }}
                  >
                    {signal}
                  </div>
                ))}

                <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-emerald-50 via-emerald-100/70 to-transparent" />
                <div className="absolute -bottom-10 left-[-4%] h-40 w-[64%] rounded-[50%] bg-emerald-500/28" />
                <div className="absolute -bottom-8 right-[-2%] h-44 w-[66%] rounded-[50%] bg-emerald-700/18" />
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-emerald-950/12 to-transparent" />

                <div className="absolute bottom-14 left-10 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-xl">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-emerald-100 p-2.5 text-emerald-700">
                      <Factory className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                        Facility pulse
                      </p>
                      <p className="text-sm font-medium text-slate-900">Scope-aware operations across every site</p>
                      <p className="text-xs text-slate-600">Track activity, sync records, and prepare reports from one place.</p>
                    </div>
                  </div>
                </div>

                <div className="absolute right-8 top-24 rounded-3xl border border-white/70 bg-white/88 p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-lime-100 p-2 text-lime-700">
                      <Wind className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lime-700">Carbon signal</p>
                      <p className="text-sm font-medium text-slate-900">From raw activity to disclosure-ready totals</p>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-0 left-1/2 flex w-[78%] -translate-x-1/2 items-end gap-2">
                  <div className="h-12 flex-1 rounded-t-[1.5rem] bg-slate-900/75" />
                  <div className="h-20 w-16 rounded-t-[1.5rem] bg-slate-900/80" />
                  <div className="h-14 w-10 rounded-t-[1rem] bg-slate-900/70" />
                  <div className="h-24 w-20 rounded-t-[1.5rem] bg-slate-900/85" />
                  <div className="h-16 w-12 rounded-t-[1rem] bg-slate-900/75" />
                </div>
              </div>
            </div>
          </section>

          <div className="relative flex items-center justify-center lg:justify-end">
            <Card className="w-full max-w-md overflow-hidden border-emerald-200/80 bg-white/92 shadow-[0_35px_90px_-45px_rgba(15,118,110,0.45)] backdrop-blur-xl">
              <div className="h-2 bg-gradient-to-r from-emerald-500 via-lime-400 to-teal-400" />
              <CardHeader className="space-y-5 px-6 pt-7 text-center sm:px-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-2xl text-slate-950">{title}</CardTitle>
                  <CardDescription className="text-sm leading-6 text-slate-600">{description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 px-6 pb-6 sm:px-8 sm:pb-8">
                <form className="space-y-4" onSubmit={handleSubmit}>
                  {alertMessage ? (
                    <Alert className="border-amber-200 bg-amber-50/90 text-amber-950">
                      <AlertCircle className="h-4 w-4 text-amber-700" />
                      <AlertTitle>Workspace notice</AlertTitle>
                      <AlertDescription className="text-amber-900/80">{alertMessage}</AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="auth-email">Work email</Label>
                    <Input
                      id="auth-email"
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@company.com"
                      autoComplete="username"
                      className="border-emerald-100 bg-emerald-50/40 focus-visible:border-emerald-300 focus-visible:ring-emerald-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="auth-token">Access token</Label>
                    <Input
                      id="auth-token"
                      type="password"
                      required
                      value={token}
                      onChange={(event) => setToken(event.target.value)}
                      placeholder="Enter access token"
                      autoComplete="current-password"
                      className="border-emerald-100 bg-emerald-50/40 focus-visible:border-emerald-300 focus-visible:ring-emerald-200"
                    />
                    <p className="text-xs leading-relaxed text-slate-500">{helperText}</p>
                  </div>
                  {error ? (
                    <Alert className="border-red-200 bg-red-50/90 text-red-950" variant="destructive">
                      <AlertCircle className="h-4 w-4 text-red-700" />
                      <AlertTitle>Unable to sign in</AlertTitle>
                      <AlertDescription className="text-red-900/80">{error}</AlertDescription>
                    </Alert>
                  ) : null}
                  <Button
                    className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700"
                    disabled={isSubmitting || isRedirecting}
                    type="submit"
                  >
                    {isRedirecting ? 'Redirecting...' : isSubmitting ? 'Unlocking...' : submitLabel}
                  </Button>
                </form>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/65 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-white p-2 text-emerald-700 shadow-sm">
                      <Leaf className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-900">Eco-Loom keeps the login surface focused and protected.</p>
                      <p className="text-xs leading-relaxed text-slate-600">
                        Sign in to work across facility data, factor-backed emissions, and reporting workflows in one place.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 pt-1 sm:flex-row sm:items-center sm:justify-between">
                  <Button asChild className="justify-start px-0 text-slate-600 hover:text-slate-900" variant="ghost">
                    <Link href={backHref}>
                      <ArrowLeft className="h-4 w-4" />
                      {backLabel}
                    </Link>
                  </Button>
                  {actions}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
