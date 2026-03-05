'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

/**
 * OAuth callback handler.
 *
 * After Google redirects back, Supabase SSR exchanges the code for a session.
 * This page waits for the session then sends the user to the dashboard.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // The @supabase/ssr client automatically picks up the
    // `code` / `access_token` fragment from the URL.
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (data.session) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="font-mono text-sm">Signing you in…</p>
    </div>
  );
}
