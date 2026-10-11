import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { Question } from '@/lib/models/Question';
import { sessionUserId } from '@/lib/auth';
import { Logo } from '@/components/Shell';

export const dynamic = 'force-dynamic';

const FEATURES = [
  {
    n: '01',
    tag: 'Real papers',
    title: 'Not imitations',
    body: 'Every question is lifted from an actual KCET paper, with the original diagrams, circuits and formulae intact — not retyped approximations.',
  },
  {
    n: '02',
    tag: 'Solutions',
    title: 'The working, step by step',
    body: 'Submit, and each question opens into the full method. You see where your approach broke, not just that it did.',
  },
  {
    n: '03',
    tag: 'Diagnosis',
    title: 'It names your weak chapters',
    body: 'Accuracy is tracked per chapter and weighted by how often you have proved it, so one lucky answer is never mistaken for mastery.',
  },
  {
    n: '04',
    tag: 'Planning',
    title: 'A plan that follows results',
    body: 'Say how long you can study each day. It schedules the chapters you keep getting wrong, and rebalances after every test.',
  },
  {
    n: '05',
    tag: 'Exam mode',
    title: 'Pressure, on purpose',
    body: 'Full screen, no copy-paste, and every time you leave the window is recorded. Three warnings and the paper submits itself.',
  },
  {
    n: '06',
    tag: 'Free',
    title: 'Nothing held back',
    body: 'No paid tier, no question limit, no advertising. Built so cost is never the reason a student walks in underprepared.',
  },
];

export default async function Landing() {
  if (sessionUserId()) redirect('/dashboard');

  await connectDB();
  const [total, years, withSolutions, pradeep] = await Promise.all([
    Question.countDocuments(),
    Question.distinct('year'),
    Question.countDocuments({
      $or: [{ solutionText: { $ne: '' } }, { 'solutionImages.0': { $exists: true } }],
    }),
    Question.countDocuments({ bank: 'pradeep' }),
  ]);
  const kcet = total - pradeep;

  return (
    <div className="min-h-dvh bg-paper">
      {/* ------------------------------------------------------------ nav */}
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link href="/login" className="px-3 py-2 text-sm font-medium text-ink-600 hover:text-ink-900">
              Sign in
            </Link>
            <Link href="/register" className="btn-dark text-[13px]">
              Create a free account
            </Link>
          </nav>
        </div>
      </header>

      {/* ----------------------------------------------------------- hero */}
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-14 sm:px-8 sm:pt-20">
        <p className="label inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-coral-500" />
          Karnataka CET · free forever
        </p>

        <h1 className="display-lg mt-7 max-w-4xl text-[2.6rem] leading-[1.04] sm:text-6xl lg:text-[4.2rem]">
          Practise on the real papers, and find out exactly what you are{' '}
          <span className="text-coral-500">getting wrong.</span>
        </h1>

        <p className="mt-7 max-w-2xl text-[17px] leading-relaxed text-ink-600">
          {kcet.toLocaleString('en-IN')} questions from {years.length} years of Physics, Chemistry
          and Mathematics papers
          {pradeep > 0 && <> plus {pradeep.toLocaleString('en-IN')} from the Pradeep reference books</>}
          {' '}— {withSolutions.toLocaleString('en-IN')} with a full worked solution. Sit a timed
          mock, get your weak chapters named, and work to a plan.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link href="/register" className="btn-primary px-7 py-3 text-[15px]">
            Start practising
          </Link>
          <Link href="/login" className="btn-secondary px-6 py-3 text-[15px]">
            I already have an account
          </Link>
        </div>

        <dl className="mt-16 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-line pt-9 sm:grid-cols-4">
          {[
            [total.toLocaleString('en-IN'), 'Questions'],
            [withSolutions.toLocaleString('en-IN'), 'Worked solutions'],
            [String(years.length), 'Years of papers'],
            ['₹0', 'Cost, always'],
          ].map(([v, l]) => (
            <div key={l}>
              <dd className="display text-[2.1rem] leading-none">{v}</dd>
              <dt className="label mt-2">{l}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* ------------------------------------------------------- features */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <h2 className="display text-3xl sm:text-4xl">What you get</h2>
          <div className="mt-9 rule-grid sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.n} className="p-6 sm:p-7">
                <p className="label">
                  {f.n} <span className="mx-1 text-ink-300">/</span> {f.tag}
                </p>
                <h3 className="display mt-4 text-xl">{f.title}</h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-ink-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ cta */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="relative overflow-hidden rounded-[22px] bg-navy-900 px-7 py-14 text-center sm:px-14">
          <p className="label text-navy-200">The KEA marking scheme</p>
          <h2 className="display-lg mt-4 text-3xl text-white sm:text-[2.6rem] sm:leading-[1.1]">
            One mark per question.<br />
            <span className="text-coral-300">Nothing deducted for a wrong answer.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-navy-100/80">
            Scored exactly the way KEA scores it — so the number you see here is the number you can
            expect, and a guess always beats a blank.
          </p>
          <Link href="/register" className="btn mt-9 bg-white px-7 py-3 text-[15px] text-navy-900 hover:bg-ink-100">
            Create your free account
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-[13px] text-ink-400 sm:px-8">
          <Logo compact />
          <p className="max-w-lg">
            Questions are reproduced from previous-year KCET papers and reference texts for study
            purposes.
          </p>
        </div>
      </footer>
    </div>
  );
}
