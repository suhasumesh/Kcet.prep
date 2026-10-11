'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AuthShell from '@/components/AuthShell';

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get('token');
  const email = params.get('email');
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>(token ? 'working' : 'idle');
  const [message, setMessage] = useState('');
  const [resent, setResent] = useState<null | 'sending' | 'sent' | 'logged'>(null);

  async function resend() {
    setResent('sending');
    const r = await fetch('/api/auth/resend', { method: 'POST' });
    const d = await r.json().catch(() => ({}));
    setResent(d?.emailSent ? 'sent' : 'logged');
  }

  useEffect(() => {
    if (!token || !email) return;
    fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, email }),
    })
      .then(async (r) => {
        const d = await r.json();
        if (r.ok) setState('done');
        else {
          setMessage(d.error || 'That link did not work.');
          setState('error');
        }
      })
      .catch(() => {
        setMessage('Could not reach the server.');
        setState('error');
      });
  }, [token, email]);

  return (
    <AuthShell
      title={state === 'done' ? 'Email confirmed' : 'Confirm your email'}
      footer={<Link href="/dashboard" className="font-semibold text-coral-600 hover:underline">Go to dashboard</Link>}
    >
      {state === 'working' && <p className="text-sm text-ink-600">Checking your link…</p>}
      {state === 'done' && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
          Your email is confirmed. Everything is unlocked.
        </p>
      )}
      {state === 'error' && (
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
          {message}
        </p>
      )}
      {(state === 'idle' || state === 'error') && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-ink-600">
            Open the link in the email we sent you, or send yourself a fresh one.
          </p>
          <button onClick={resend} disabled={resent === 'sending'} className="btn-secondary w-full">
            {resent === 'sending' ? 'Sending…' : 'Send a new confirmation link'}
          </button>
          {resent === 'sent' && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
              Sent. Check your inbox.
            </p>
          )}
          {resent === 'logged' && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
              Email is not configured on this server, so the link was written to the server log.
              Set SMTP_HOST and SMTP_USER in .env.local to send real mail.
            </p>
          )}
        </div>
      )}
    </AuthShell>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyInner />
    </Suspense>
  );
}
