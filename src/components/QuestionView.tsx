'use client';

import clsx from '@/lib/clsx';
import SolutionText from '@/components/SolutionText';

export type QImage = { src: string; w: number; h: number };
export type QOption = { letter: 'A' | 'B' | 'C' | 'D'; text: string; img: QImage | null };
export type QData = {
  id: string;
  subject: string;
  chapter: string;
  year: number;
  number: number;
  bank?: string;
  book?: string;
  /** how the source prints its option markers, when they are in the image */
  optionStyle?: 'letter' | 'number';
  stemText: string;
  stemImages: QImage[];
  options: QOption[];
  answer?: 'A' | 'B' | 'C' | 'D' | null;
  solutionText?: string;
  solutionImages?: QImage[];
  /** 'generated' when the working was written for us, not printed in a book */
  solutionSource?: string;
};

/**
 * Crops are rendered at 170dpi. Shown at their true physical size the body text
 * lands at about 10px, which is far too small next to the rest of the interface,
 * so they are scaled up to put the question text at roughly 15px — the same
 * weight as the surrounding UI — while still fitting a phone.
 */
const CROP_DIVISOR = 1.55;

/**
 * Where the crops are served from. Empty by default, so they come out of
 * public/questions on the same host. Point it at a bucket -- Cloudflare R2,
 * Vercel Blob, anything that serves files over https -- to keep a hundred
 * megabytes of images out of the deployment without touching any code.
 */
const ASSET_BASE = (process.env.NEXT_PUBLIC_ASSET_BASE ?? '').replace(/\/$/, '');

function Crop({ img, className, eager }: { img: QImage; className?: string; eager?: boolean }) {
  const cssWidth = Math.round(img.w / CROP_DIVISOR);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${ASSET_BASE}/questions/${img.src}`}
      alt=""
      width={img.w}
      height={img.h}
      loading={eager ? 'eager' : 'lazy'}
      decoding={eager ? 'sync' : 'async'}
      draggable={false}
      className={clsx('qimg', className)}
      style={{ width: cssWidth, maxWidth: '100%' }}
    />
  );
}

/**
 * The source PDFs put every formula in an image, so a crop is the only faithful
 * rendering. Where a part is pure prose the crop is still used for consistency,
 * and the text is kept as the accessible label.
 */
export function Stem({ q, eager }: { q: QData; eager?: boolean }) {
  if (q.stemImages?.length) {
    return (
      <div className="space-y-1">
        {q.stemImages.map((img, i) => (
          // the question on screen must not wait on a lazy load
          <Crop key={i} img={img} eager={eager} />
        ))}
        {q.stemText ? <span className="sr-only">{q.stemText}</span> : null}
      </div>
    );
  }
  return <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-900">{q.stemText}</p>;
}

export function OptionBody({ opt }: { opt: QOption }) {
  if (opt.img) {
    return (
      <>
        <Crop img={opt.img} />
        {opt.text ? <span className="sr-only">{opt.text}</span> : null}
      </>
    );
  }
  if (opt.text) return <span className="text-[15px] leading-relaxed">{opt.text}</span>;
  // Scanned papers are cropped as one band per question, so the options are
  // printed inside the stem image and the button carries only its letter.
  return null;
}

/** Where this question came from, for the badge on the card. */
export function sourceLabel(q: QData) {
  if (q.bank === 'pradeep') return q.book || 'Pradeep';
  return q.year ? `KCET ${q.year}` : 'KCET';
}

/** True when the four choices are printed inside the question image itself. */
export function optionsInImage(q: QData) {
  return q.options.length > 0 && q.options.every((o) => !o.img && !o.text);
}

/**
 * The markers to put on the answer buttons when the choices are inside the
 * image: whatever the page itself prints beside them.
 *
 * The KEA booklets number their options (1) to (4); every book in the bank
 * letters them (a) to (d). Offering "1 2 3 4" against a question whose
 * options read (a) (b) (c) (d) asks a student to translate under exam
 * pressure, which is exactly how a right answer becomes a wrong one.
 */
export function optionMarkers(q: QData): readonly string[] {
  return q.optionStyle === 'letter' ? ['a', 'b', 'c', 'd'] : ['1', '2', '3', '4'];
}

export function Solution({ q }: { q: QData }) {
  const hasImages = Boolean(q.solutionImages?.length);
  const hasText = Boolean(q.solutionText?.trim());
  if (!hasImages && !hasText) {
    return (
      <p className="text-sm text-ink-500">
        A worked solution is not available for this question yet. The correct option is marked above.
      </p>
    );
  }
  if (hasImages) {
    return (
      <div className="space-y-1">
        {q.solutionImages!.map((img, i) => (
          <Crop key={i} img={img} />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <SolutionText text={q.solutionText!} />
      {/* The answer above it is the official key either way. This says only
          that the working was written for us rather than printed in a book,
          which a student is entitled to know before trusting a step. */}
      {q.solutionSource && (
        <p className="text-xs text-ink-400">
          Worked out for this app, not reproduced from the examiner. The marked
          answer is from the official key.
        </p>
      )}
    </div>
  );
}
