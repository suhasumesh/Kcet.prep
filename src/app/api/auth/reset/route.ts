import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/User';
import { hashToken } from '@/lib/mail';

export async function POST(req: Request) {
  const { token, email, password } = await req.json().catch(() => ({}));
  if (!token || !email || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Choose a password of at least 8 characters.' }, { status: 400 });
  }
  await connectDB();
  const user = await User.findOne({
    email: String(email).toLowerCase(),
    resetTokenHash: hashToken(String(token)),
    resetTokenExp: { $gt: new Date() },
  });
  if (!user) {
    return NextResponse.json({ error: 'This reset link has expired or has already been used.' }, { status: 400 });
  }
  user.passwordHash = await bcrypt.hash(password, 10);
  user.resetTokenHash = null;
  user.resetTokenExp = null;
  await user.save();
  return NextResponse.json({ ok: true });
}
