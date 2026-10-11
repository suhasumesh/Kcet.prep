import crypto from 'crypto';
import nodemailer from 'nodemailer';

/**
 * Tokens are mailed in the clear but only their SHA-256 is stored, so a leaked
 * database dump cannot be used to verify accounts or reset passwords.
 */
export function makeToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function transport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

/**
 * Sends mail when SMTP is configured. With no SMTP set up -- the default for a
 * fresh clone -- the message is logged instead so sign-up still works locally
 * without anyone having to register for an email provider first.
 */
export async function sendMail(to: string, subject: string, html: string, text: string) {
  const t = transport();
  if (!t) {
    console.log('\n--- email not sent (SMTP unset); contents below ---');
    console.log('to:', to, '\nsubject:', subject, '\n' + text + '\n');
    return { delivered: false as const };
  }
  await t.sendMail({
    from: process.env.MAIL_FROM || 'KCET Prep <no-reply@kcetprep.local>',
    to,
    subject,
    text,
    html,
  });
  return { delivered: true as const };
}

function shell(title: string, body: string, cta?: { href: string; label: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" style="max-width:520px;background:#fff;border:1px solid #e5e8ef;border-radius:12px">
      <tr><td style="padding:28px 28px 8px">
        <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#62718c;font-weight:600">KCET Prep</div>
        <h1 style="margin:12px 0 0;font-size:20px;color:#1b1f28">${title}</h1>
      </td></tr>
      <tr><td style="padding:8px 28px 24px;font-size:15px;line-height:1.6;color:#3f4a5e">${body}
        ${cta ? `<div style="margin-top:24px"><a href="${cta.href}" style="display:inline-block;background:#1b62db;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:600;font-size:15px">${cta.label}</a></div>
        <p style="margin-top:20px;font-size:13px;color:#8290a8">If the button does not work, paste this link into your browser:<br><span style="word-break:break-all">${cta.href}</span></p>` : ''}
      </td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:12px;color:#8290a8">Free KCET preparation. Built for students.</p>
  </td></tr></table></body></html>`;
}

export function verifyEmail(name: string, link: string) {
  return {
    subject: 'Confirm your email - KCET Prep',
    html: shell(
      `Welcome, ${name}`,
      '<p>Confirm this address to activate your account and start taking mock tests.</p><p>The link is valid for 24 hours.</p>',
      { href: link, label: 'Confirm email' },
    ),
    text: `Welcome, ${name}.\nConfirm your email: ${link}\nThe link is valid for 24 hours.`,
  };
}

export function resetEmail(name: string, link: string) {
  return {
    subject: 'Reset your password - KCET Prep',
    html: shell(
      'Reset your password',
      `<p>Hello ${name}, we received a request to reset your password.</p><p>The link is valid for 1 hour. If you did not ask for this, you can ignore this email.</p>`,
      { href: link, label: 'Choose a new password' },
    ),
    text: `Hello ${name}.\nReset your password: ${link}\nValid for 1 hour. Ignore this email if you did not request it.`,
  };
}
