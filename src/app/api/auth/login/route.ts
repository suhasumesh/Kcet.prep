import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/User';
import { signSession, setSessionCookie } from '@/lib/auth';

const Body = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 });
  }
  await connectDB();
  const user = await User.findOne({ email: parsed.data.email });
  // One message for both cases, so the response cannot be used to discover
  // which email addresses have accounts.
  const bad = NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
  if (!user) return bad;
  if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) return bad;

  setSessionCookie(signSession(String(user._id)));
  return NextResponse.json({ ok: true });
}
