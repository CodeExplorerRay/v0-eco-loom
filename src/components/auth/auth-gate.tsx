'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AccessTokenLogin, SessionState } from '@/components/auth/access-token-login';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        const data = await response.json();
        if (active) {
          setSession(data);
        }
      } catch {
        if (active) {
          setSession({ authenticated: false });
          setError('Failed to check the current session');
        }
      }
    };

    void loadSession();

    return () => {
      active = false;
    };
  }, []);

  if (session === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_38%),linear-gradient(135deg,_#f4fbf7,_#ecfdf5_45%,_#d1fae5)]">
        <div className="flex items-center gap-3 rounded-full border border-emerald-200/80 bg-white/80 px-5 py-3 text-sm text-slate-700 shadow-sm backdrop-blur">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
          Checking workspace access...
        </div>
      </div>
    );
  }

  if (session?.authenticated) {
    return <>{children}</>;
  }

  return (
    <AccessTokenLogin
      description="Use your work email and workspace access token to unlock this protected Eco-Loom area."
      alertMessage={error}
      onSuccess={setSession}
    />
  );
}
