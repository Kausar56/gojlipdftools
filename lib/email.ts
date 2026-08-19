import { Resend } from "resend";

/**
 * Best-effort transactional email — used for support-ticket notifications
 * (see app/dashboard/tickets/actions.ts and app/admin/tickets/actions.ts).
 * Safe no-op until RESEND_API_KEY (and optionally EMAIL_FROM) is set: sign up
 * at resend.com, verify a sending domain (or use their onboarding@resend.dev
 * sandbox address for testing), then add the key to the environment. Every
 * caller already wraps this in try/catch-and-ignore, since a failed
 * notification should never block the ticket action that triggered it.
 */
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`sendEmail skipped (RESEND_API_KEY not set): "${subject}" to ${to}`);
    return;
  }

  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM || "Gojli Support <onboarding@resend.dev>";
  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) throw new Error(error.message);
}

export function ticketReplyEmail({ subject, ticketUrl, fromLabel }: { subject: string; ticketUrl: string; fromLabel: string }) {
  return {
    subject: `New reply on your ticket: ${subject}`,
    html: `
      <p>${fromLabel} replied to your support ticket "<strong>${subject}</strong>".</p>
      <p><a href="${ticketUrl}">View the conversation</a></p>
    `,
  };
}

export function newTicketEmail({ subject, ticketUrl, userEmail }: { subject: string; ticketUrl: string; userEmail: string }) {
  return {
    subject: `New support ticket: ${subject}`,
    html: `
      <p>${userEmail} opened a new support ticket: "<strong>${subject}</strong>".</p>
      <p><a href="${ticketUrl}">View the ticket</a></p>
    `,
  };
}
