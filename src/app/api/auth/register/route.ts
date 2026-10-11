import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/User';
import { makeToken, sendMail, verifyEmail } from '@/lib/mail';
import { signSession, setSessionCookie } from '@/lib/auth';

const Body = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters').max(200),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name, email, password } = parsed.data;

  await connectDB();
  if (await User.exists({ email })) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
  }

  const { token, hash } = makeToken();
  const user = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    verifyTokenHash: hash,
    verifyTokenExp: new Date(Date.now() + 24 * 3600 * 1000),
  });

  const link = `${process.env.APP_URL || 'http://localhost:3000'}/verify?token=${token}&email=${encodeURIComponent(email)}`;
  const mail = verifyEmail(name, link);
  const { delivered } = await sendMail(email, mail.subject, mail.html, mail.text);

  // Signing in straight away keeps the first run frictionless; verification is
  // still requested, and is required before any email-bearing feature is used.
  setSessionCookie(signSession(String(user._id)));
  return NextResponse.json({ ok: true, emailSent: delivered });
}
