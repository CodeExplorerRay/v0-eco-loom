'use client';

import Link from 'next/link';
import { AccessTokenLogin } from '@/components/auth/access-token-login';

export function LoginPageClient() {
  return (
    <AccessTokenLogin
      title="Log In to Eco-Loom"
      description="Enter your workspace credentials to access Eco-Loom's facility-aware carbon operations hub."
      submitLabel="Log in"
      helperText="Use the work email and access token assigned by your Eco-Loom workspace admin. Access tokens are case-sensitive and tied to your workspace."
      redirectHref="/dashboard"
      actions={<Link className="text-sm font-medium text-emerald-700 hover:text-emerald-800" href="/">Need the public site instead?</Link>}
    />
  );
}
