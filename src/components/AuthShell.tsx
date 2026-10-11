import Link from 'next/link';
import { Logo } from './Shell';

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-8 sm:px-8">
        <Link href="/" className="inline-flex"><Logo /></Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-ink-600">{subtitle}</p>}
            <div className="mt-7">{children}</div>
            {footer && <div className="mt-6 text-sm text-ink-600">{footer}</div>}
          </div>
        </div>
      </div>

      <aside className="hidden flex-col justify-center bg-navy-950 px-12 lg:flex">
        <blockquote className="max-w-md">
          <p className="text-2xl font-semibold leading-snug text-white">
            “The paper does not test what you know. It tests what you can do in eighty minutes.”
          </p>
          <p className="mt-6 text-sm leading-relaxed text-ink-400">
            Practise on the real thing, under the real clock, and let the results tell you which
            chapters to go back to. No cost, no limits.
          </p>
        </blockquote>
      </aside>
    </div>
  );
}
