import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/User';
import { requireUserId } from '@/lib/auth';
import { makeToken, sendMail, verifyEmail } from '@/lib/mail';

export const dynamic = 'force-dynamic';

/** Issue a fresh confirmation link for the signed-in user. */
export async function POST() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

  const { token, hash } = makeToken();
  user.verifyTokenHash = hash;
  user.verifyTokenExp = new Date(Date.now() + 24 * 3600 * 1000);
  await user.save();

  const link = `${process.env.APP_URL || 'http://localhost:3000'}/verify?token=${token}&email=${encodeURIComponent(user.email)}`;
  const mail = verifyEmail(user.name, link);
  const { delivered } = await sendMail(user.email, mail.subject, mail.html, mail.text);
  return NextResponse.json({ ok: true, emailSent: delivered });
}
