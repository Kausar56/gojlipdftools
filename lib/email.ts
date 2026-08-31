import nodemailer, { type Transporter } from "nodemailer";

/**
 * Best-effort transactional email — used for support-ticket notifications
 * (see app/dashboard/tickets/actions.ts and app/admin/tickets/actions.ts).
 * Sent through a real Hostinger-hosted mailbox over SMTP (nodemailer), not a
 * third-party email API — this app is already on Hostinger, so the mailbox
 * that comes with the hosting plan is the sending account.
 *
 * Safe no-op until the required env vars are set: create/confirm a mailbox
 * in hPanel (Emails), then set:
 *   HOSTINGER_SMTP_USER     the full mailbox address, e.g. support@gojli.com
 *   HOSTINGER_SMTP_PASSWORD that mailbox's password
 *   HOSTINGER_SMTP_HOST     optional, defaults to smtp.hostinger.com
 *   HOSTINGER_SMTP_PORT     optional, defaults to 465 (SSL)
 *   EMAIL_FROM              optional display name, e.g. "Gojli Support <support@gojli.com>" —
 *                           defaults to the mailbox address itself
 * Every caller already wraps this in try/catch-and-ignore, since a failed
 * notification should never block the ticket action that triggered it.
 */
let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const user = process.env.HOSTINGER_SMTP_USER;
  const password = process.env.HOSTINGER_SMTP_PASSWORD;
  if (!user || !password) return null;

  if (!cachedTransporter) {
    const port = Number(process.env.HOSTINGER_SMTP_PORT || 465);
    cachedTransporter = nodemailer.createTransport({
      host: process.env.HOSTINGER_SMTP_HOST || "smtp.hostinger.com",
      port,
      // Port 465 is always implicit-SSL; 587 (or anything else) uses
      // STARTTLS instead — nodemailer needs `secure` to match the port.
      secure: port === 465,
      auth: { user, pass: password },
    });
  }
  return cachedTransporter;
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<void> {
  const transporter = getTransporter();
  const user = process.env.HOSTINGER_SMTP_USER;
  if (!transporter || !user) {
    console.warn(`sendEmail skipped (HOSTINGER_SMTP_USER/HOSTINGER_SMTP_PASSWORD not set): "${subject}" to ${to}`);
    return;
  }

  const from = process.env.EMAIL_FROM || user;
  await transporter.sendMail({ from, to, subject, html });
}

/**
 * Escapes HTML-sensitive characters before interpolating user-controlled
 * text (ticket subject, email address) into the template strings below.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Keep in sync with email-templates/ticket-reply.html at the project root
// (that file is the paste-into-a-preview-tool / design reference copy).
export function ticketReplyEmail({ subject, ticketUrl, fromLabel }: { subject: string; ticketUrl: string; fromLabel: string }) {
  const safeSubject = escapeHtml(subject);
  const safeFromLabel = escapeHtml(fromLabel);
  return {
    subject: `New reply on your ticket: ${subject}`,
    html: `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New reply on your ticket — Gojli</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#2663BB;height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
<tr><td align="center" style="padding:32px 24px 12px;">
<img src="https://www.gojli.com/logo.png" width="48" height="48" alt="Gojli" style="display:block;border:0;border-radius:10px;">
<div style="margin-top:10px;font-size:20px;font-weight:700;color:#0f172a;">Gojli</div>
</td></tr>
<tr><td style="padding:8px 40px 8px;">
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;"><tr><td style="background:#ecfdf5;color:#059669;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:6px 14px;border-radius:999px;">New Reply</td></tr></table>
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#0f172a;font-weight:700;text-align:center;">${safeFromLabel} replied to your ticket</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#334155;text-align:center;">There's a new message on your support ticket:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#f8fafc;border-radius:8px;"><tr><td style="padding:16px 18px;font-size:14px;color:#0f172a;font-weight:600;">"${safeSubject}"</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;"><tr><td style="border-radius:8px;background:#2663BB;"><a href="${ticketUrl}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">View the Conversation</a></td></tr></table>
<p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#94a3b8;text-align:center;">You're receiving this because you have an open support ticket with Gojli.</p>
</td></tr>
<tr><td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
<p style="margin:0 0 8px;font-size:12px;color:#64748b;line-height:1.6;">Gojli — Free online PDF tools. Merge, split, compress, convert &amp; edit PDFs right in your browser.</p>
<p style="margin:0;font-size:12px;color:#94a3b8;">&copy; 2026 Gojli. All rights reserved. &middot; <a href="https://www.gojli.com" style="color:#2663BB;text-decoration:none;">gojli.com</a></p>
</td></tr>
</table>
</td></tr></table>
</body></html>`,
  };
}

// Keep in sync with email-templates/ticket-open.html at the project root
// (that file is the paste-into-a-preview-tool / design reference copy).
export function newTicketEmail({ subject, ticketUrl, userEmail }: { subject: string; ticketUrl: string; userEmail: string }) {
  const safeSubject = escapeHtml(subject);
  const safeUserEmail = escapeHtml(userEmail);
  return {
    subject: `New support ticket: ${subject}`,
    html: `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New support ticket — Gojli</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#2663BB;height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
<tr><td align="center" style="padding:32px 24px 12px;">
<img src="https://www.gojli.com/logo.png" width="48" height="48" alt="Gojli" style="display:block;border:0;border-radius:10px;">
<div style="margin-top:10px;font-size:20px;font-weight:700;color:#0f172a;">Gojli</div>
</td></tr>
<tr><td style="padding:8px 40px 8px;">
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;"><tr><td style="background:#eff6ff;color:#2663BB;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:6px 14px;border-radius:999px;">New Ticket</td></tr></table>
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#0f172a;font-weight:700;text-align:center;">A new support ticket was opened</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#334155;text-align:center;"><strong>${safeUserEmail}</strong> opened a new support ticket:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#f8fafc;border-radius:8px;"><tr><td style="padding:16px 18px;font-size:14px;color:#0f172a;font-weight:600;">"${safeSubject}"</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;"><tr><td style="border-radius:8px;background:#2663BB;"><a href="${ticketUrl}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">View Ticket</a></td></tr></table>
</td></tr>
<tr><td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
<p style="margin:0 0 8px;font-size:12px;color:#64748b;line-height:1.6;">This is an automated notification from the Gojli support system.</p>
<p style="margin:0;font-size:12px;color:#94a3b8;">&copy; 2026 Gojli. All rights reserved. &middot; <a href="https://www.gojli.com" style="color:#2663BB;text-decoration:none;">gojli.com</a></p>
</td></tr>
</table>
</td></tr></table>
</body></html>`,
  };
}

// Keep in sync with email-templates/welcome.html at the project root
// (that file is the paste-into-a-preview-tool / design reference copy).
export function welcomeEmail({ userName }: { userName: string }) {
  const safeUserName = escapeHtml(userName);
  return {
    subject: "Welcome to Gojli",
    html: `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to Gojli</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#2663BB;height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
<tr><td align="center" style="padding:32px 24px 12px;">
<img src="https://www.gojli.com/logo.png" width="48" height="48" alt="Gojli" style="display:block;border:0;border-radius:10px;">
<div style="margin-top:10px;font-size:20px;font-weight:700;color:#0f172a;">Gojli</div>
</td></tr>
<tr><td style="padding:8px 40px 8px;">
<h1 style="margin:16px 0 12px;font-size:22px;line-height:1.3;color:#0f172a;font-weight:700;text-align:center;">Welcome to Gojli, ${safeUserName} &#128075;</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#334155;text-align:center;">Your account is ready. Gojli gives you fast, free, browser-based PDF tools — nothing to install, nothing uploaded that you don't want to be.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
<tr>
<td width="50%" style="padding:10px;vertical-align:top;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;"><tr><td style="padding:16px;"><div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">Merge &amp; Split</div><div style="font-size:13px;color:#64748b;line-height:1.5;">Combine or separate pages in seconds.</div></td></tr></table></td>
<td width="50%" style="padding:10px;vertical-align:top;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;"><tr><td style="padding:16px;"><div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">Compress &amp; Convert</div><div style="font-size:13px;color:#64748b;line-height:1.5;">Shrink file size or switch formats.</div></td></tr></table></td>
</tr>
<tr>
<td width="50%" style="padding:10px;vertical-align:top;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;"><tr><td style="padding:16px;"><div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">Edit &amp; Sign</div><div style="font-size:13px;color:#64748b;line-height:1.5;">Add text, shapes, or a signature.</div></td></tr></table></td>
<td width="50%" style="padding:10px;vertical-align:top;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;"><tr><td style="padding:16px;"><div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">Watermark &amp; Protect</div><div style="font-size:13px;color:#64748b;line-height:1.5;">Stamp, lock, or unlock a PDF.</div></td></tr></table></td>
</tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;"><tr><td style="border-radius:8px;background:#2663BB;"><a href="https://www.gojli.com/dashboard" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">Go to Dashboard</a></td></tr></table>
<p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#94a3b8;text-align:center;">Need help? Just reply to this email or open a support ticket from your dashboard — our team is happy to help.</p>
</td></tr>
<tr><td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
<p style="margin:0 0 8px;font-size:12px;color:#64748b;line-height:1.6;">Gojli — Free online PDF tools. Merge, split, compress, convert &amp; edit PDFs right in your browser.</p>
<p style="margin:0;font-size:12px;color:#94a3b8;">&copy; 2026 Gojli. All rights reserved. &middot; <a href="https://www.gojli.com" style="color:#2663BB;text-decoration:none;">gojli.com</a></p>
</td></tr>
</table>
</td></tr></table>
</body></html>`,
  };
}
