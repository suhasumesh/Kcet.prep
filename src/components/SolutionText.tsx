import { parseSolution, type Block, type Span } from '@/lib/solution';

/**
 * Render a worked solution.
 *
 * The solutions are long — deliberately so, since a student reading one at
 * eleven at night has no teacher to ask. Length only helps if the eye can find
 * its way, so each kind of line is given its own shape: steps announce
 * themselves, formulas sit apart from the prose that explains them, and the
 * final answer is impossible to miss.
 *
 * Colour carries meaning and nothing else. ✓ and ✗ mark a step that holds and
 * one that fails, and the amber note marks the handful of questions where the
 * printed answer key is wrong — the one thing a student must not skim past.
 */

function Inline({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((s, i) => {
        switch (s.t) {
          case 'b':
            return (
              <strong key={i} className="font-semibold text-ink-900">
                {s.v}
              </strong>
            );
          case 'i':
            return (
              <em key={i} className="italic">
                {s.v}
              </em>
            );
          case 'sub':
            return (
              <span key={i}>
                {s.base}
                <sub className="text-[0.75em]">{s.sub}</sub>
              </span>
            );
          case 'ok':
            return (
              <span key={i} aria-label="correct" className="px-px font-semibold text-chemistry">
                ✓
              </span>
            );
          case 'no':
            return (
              <span key={i} aria-label="incorrect" className="px-px font-semibold text-coral-600">
                ✗
              </span>
            );
          default:
            return <span key={i}>{s.v}</span>;
        }
      })}
    </>
  );
}

function One({ b }: { b: Block }) {
  switch (b.k) {
    case 'head':
      return (
        <p className="pt-2 text-[15px] leading-[1.65] text-ink-700">
          <span className="font-semibold text-navy-700">
            <Inline spans={b.title} />
          </span>{' '}
          <Inline spans={b.body} />
        </p>
      );

    case 'formula':
      return (
        <p
          className="my-1 border-l-2 border-navy-200 bg-navy-50/50 py-1.5 pl-3 pr-2
                     font-mono text-[14px] leading-relaxed text-ink-800"
        >
          <Inline spans={b.body} />
        </p>
      );

    case 'answer':
      return (
        <p
          className="mt-3 flex flex-wrap items-baseline gap-x-2 rounded-lg border
                     border-chemistry/25 bg-chemistry/[0.06] px-3 py-2.5
                     text-[15px] font-medium leading-relaxed text-ink-900"
        >
          <span className="text-[10px] font-semibold uppercase tracking-label text-chemistry">
            Answer
          </span>
          <span>
            <Inline spans={b.body} />
          </span>
        </p>
      );

    // The printed key is wrong on about a hundred questions in this bank. A
    // student who memorises the key instead of the working would learn the
    // error, so this is the one block that interrupts rather than flows.
    case 'note':
      return (
        <p
          className="my-2 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2.5
                     text-[14px] leading-relaxed text-amber-900"
        >
          <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-label text-amber-700">
            Note on the key
          </span>
          <Inline spans={b.body} />
        </p>
      );

    default:
      return (
        <p className="text-[15px] leading-[1.65] text-ink-700">
          <Inline spans={b.body} />
        </p>
      );
  }
}

export default function SolutionText({ text }: { text: string }) {
  const blocks = parseSolution(text);
  return (
    <div className="space-y-1">
      {blocks.map((b, i) => (
        <One key={i} b={b} />
      ))}
    </div>
  );
}
