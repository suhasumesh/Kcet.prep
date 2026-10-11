import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/User';
import { makeToken, sendMail, resetEmail } from '@/lib/mail';

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  await connectDB();
  const user = email ? await User.findOne({ email: String(email).toLowerCase() }) : null;

  if (user) {
    const { token, hash } = makeToken();
    user.resetTokenHash = hash;
    user.resetTokenExp = new Date(Date.now() + 3600 * 1000);
    await user.save();
    const link = `${process.env.APP_URL || 'http://localhost:3000'}/reset?token=${token}&email=${encodeURIComponent(user.email)}`;
    const mail = resetEmail(user.name, link);
    await sendMail(user.email, mail.subject, mail.html, mail.text);
  }
  // Always the same reply, so the endpoint cannot enumerate accounts.
  return NextResponse.json({ ok: true });
}
