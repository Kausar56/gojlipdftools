# Email Templates

Branded HTML email templates for Gojli. All use the logo at
`https://www.gojli.com/logo.png` in the header and the same visual style
(primary color `#2663BB`, table-based layout for email-client compatibility).

## Supabase Auth emails (paste into Supabase dashboard)

These three are sent by **Supabase Auth itself**, not by this app's code.
Copy the file's contents into **Supabase Dashboard → Authentication →
Email Templates** for the matching template slot. Leave `{{ .ConfirmationURL }}`
exactly as-is — Supabase replaces it automatically.

| File | Supabase template slot |
|---|---|
| `confirm-signup.html` | Confirm signup |
| `reset-password.html` | Reset Password |
| `magic-link-login.html` | Magic Link |

## App-sent emails (sent via `lib/email.ts` over Hostinger SMTP)

| File | Sent when | Wired in |
|---|---|---|
| `ticket-open.html` | A user opens a new support ticket (notifies staff) | `lib/email.ts` → `newTicketEmail()`, called from `app/dashboard/tickets/actions.ts` |
| `ticket-reply.html` | Staff or user replies to a ticket (notifies the other side) | `lib/email.ts` → `ticketReplyEmail()`, called from `app/dashboard/tickets/actions.ts` and `app/admin/tickets/actions.ts` |

Both are already live — `lib/email.ts` builds this exact markup with the
real ticket subject/URL filled in.

## Ready to use, not yet wired to a trigger

| File | Intended use |
|---|---|
| `welcome.html` | Send once, right after a user's first successful login/signup. Placeholder: `{{userName}}`. No trigger exists yet — would need a "first login" check (e.g. comparing `created_at` vs `last_sign_in_at`) added to the auth callback. |
| `purchase-confirmation.html` | Send after a Premium/Business plan purchase. Placeholders: `{{planName}}`, `{{billingCycle}}`, `{{amount}}`, `{{purchaseDate}}`, `{{orderId}}`. No payment/checkout flow exists in the codebase yet — plans currently only change via admin action — so this has no trigger point until a payment integration is built.

To send either from app code, add a template function to `lib/email.ts`
(same pattern as `ticketReplyEmail`/`newTicketEmail`) that fills in the
placeholders and returns `{ subject, html }`, then call `sendEmail(...)`
from wherever the event happens.
