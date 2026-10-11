import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/User';
import { hashToken } from '@/lib/mail';

export async function POST(req: Request) {
  const { token, email } = await req.json().catch(() => ({}));
  if (!token || !email) {
    return NextResponse.json({ error: 'This confirmation link is incomplete.' }, { status: 400 });
  }
  await connectDB();
  const user = await User.findOne({
    email: String(email).toLowerCase(),
    verifyTokenHash: hashToken(String(token)),
    verifyTokenExp: { $gt: new Date() },
  });
  if (!user) {
    return NextResponse.json(
      { error: 'This confirmation link has expired or has already been used.' },
      { status: 400 },
    );
  }
  user.emailVerified = true;
  user.verifyTokenHash = null;
  user.verifyTokenExp = null;
  await user.save();
  return NextResponse.json({ ok: true });
}
