import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LoginPageClient } from '@/components/auth/login-page-client';
import { AUTH_COOKIE_NAME, getValidatedSessionFromCookieValue } from '@/lib/server/auth';

export default async function LoginPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = await getValidatedSessionFromCookieValue(sessionCookie);

  if (session) {
    redirect('/dashboard');
  }

  return <LoginPageClient />;
}
