'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import clsx from '@/lib/clsx';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: 'M3 10.8 12 3.4l9 7.4M5.6 9.4V20.6h12.8V9.4' },
  { href: '/practice', label: 'Practice', icon: 'M12 5.2v13.6M5.2 12h13.6' },
  { href: '/library', label: 'Pradeep', icon: 'M4 4.6h7a2 2 0 0 1 2 2v12.8a1.6 1.6 0 0 0-1.6-1.6H4zM20 4.6h-7a2 2 0 0 0-2 2v12.8a1.6 1.6 0 0 1 1.6-1.6H20z' },
  { href: '/patterns', label: 'Patterns', icon: 'M4 17.5 9 11l4 3.2L20 6M20 6h-4.6M20 6v4.6' },
  { href: '/tests', label: 'History', icon: 'M4 6.4h16M4 12h16M4 17.6h10' },
  { href: '/analytics', label: 'Analytics', icon: 'M4 19.4V5m5 14.4V9.6m5 9.8v-6.4m5 6.4V7.4' },
  { href: '/plan', label: 'Plan', icon: 'M7.6 3.4v3m8.8-3v3M3.8 8.6h16.4M4.6 5.4h14.8v15.2H4.6z' },
];

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-baseline gap-[1px] font-mono text-[17px] font-semibold tracking-tight">
      <span className="text-navy-900">kcet</span>
      {!compact && <span className="text-ink-400">.prep</span>}
    </span>
  );
}

export default function Shell({
  user,
  children,
}: {
  user: { name: string; email: string; streak: number; emailVerified: boolean };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const initials = user.name.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="min-h-dvh lg:flex lg:gap-0">
      {/* ------------------------------------------------- desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-line bg-white/70 px-3 py-5 backdrop-blur lg:flex">
        <Link href="/dashboard" className="mb-7 px-3"><Logo /></Link>

        <nav className="flex-1 space-y-0.5">
          {NAV.map((n) => {
            const on = isActive(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={clsx(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors',
                  on ? 'bg-navy-900 text-white' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
                )}
              >
                <Icon d={n.icon} className={clsx('h-[17px] w-[17px]', on ? 'text-white' : 'text-ink-400 group-hover:text-ink-600')} />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-line pt-3">
          {user.streak > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-coral-50 px-3 py-2 ring-1 ring-inset ring-coral-100">
              <span aria-hidden className="text-sm">🔥</span>
              <span className="text-[13px] font-semibold text-coral-800">
                {user.streak}-day streak
              </span>
            </div>
          )}
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy-900 font-mono text-[11px] font-semibold text-white">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-ink-900">{user.name}</span>
              <span className="block truncate text-[11px] text-ink-400">{user.email}</span>
            </span>
          </div>
          <button onClick={logout} className="w-full rounded-xl px-3 py-2 text-left text-[13px] font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900">
            Sign out
          </button>
        </div>
      </aside>

      {/* ------------------------------------------------------- mobile bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/dashboard"><Logo /></Link>
        <button
          onClick={() => setMenu((m) => !m)}
          aria-label="Menu"
          className="grid h-9 w-9 place-items-center rounded-xl text-ink-600 hover:bg-ink-100"
        >
          <Icon d={menu ? 'M6 6l12 12M18 6 6 18' : 'M4 7h16M4 12h16M4 17h16'} className="h-5 w-5" />
        </button>
      </div>
      {menu && (
        <div className="sticky top-[53px] z-30 border-b border-line bg-white px-3 py-2 lg:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setMenu(false)}
              className={clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                isActive(n.href) ? 'bg-navy-900 text-white' : 'text-ink-700 hover:bg-ink-100',
              )}
            >
              <Icon d={n.icon} className="h-[17px] w-[17px] opacity-70" />
              {n.label}
            </Link>
          ))}
          <button onClick={logout} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink-500">
            Sign out
          </button>
        </div>
      )}

      <main className="min-w-0 flex-1">
        {!user.emailVerified && (
          <div className="border-b border-coral-100 bg-coral-50 px-4 py-2 text-center text-[13px] text-coral-800 sm:px-6">
            Confirm your email to secure your account.{' '}
            <Link href="/verify" className="font-semibold underline underline-offset-2">Send a new link</Link>
          </div>
        )}
        <div className="mx-auto max-w-6xl px-4 py-7 sm:px-8 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
