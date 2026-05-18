import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { AUTH_COOKIE_NAME, getValidatedSessionFromCookieValue } from '@/lib/server/auth';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = await getValidatedSessionFromCookieValue(sessionCookie);

  if (!session) {
    redirect('/login');
  }

  return (
    <DashboardShell />
  );
}
