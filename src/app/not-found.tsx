import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper p-4">
      <div className="card max-w-md p-8 text-center">
        <p className="label">404</p>
        <h1 className="mt-1.5 text-xl font-bold text-ink-900">That page does not exist</h1>
        <p className="mt-1.5 text-sm text-ink-600">
          The link may be old, or the test may belong to another account.
        </p>
        <Link href="/dashboard" className="btn-primary mt-5">Go to dashboard</Link>
      </div>
    </div>
  );
}
