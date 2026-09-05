# Paddle Billing Integration

How Gojli's Pro/Business plan checkout and subscription billing works, file
by file. Paddle acts as a **Merchant of Record** — it handles global tax
(VAT/GST) collection and filing itself, so this app never touches tax logic.

> **Not the official starter kit.** Paddle's own tutorials (e.g.
> [PaddleHQ/paddle-nextjs-starter-kit](https://github.com/PaddleHQ/paddle-nextjs-starter-kit))
> walk through deploying a *fresh* Next.js template with its own
> `src/constants/pricing-tier.ts`, Supabase schema, and Vercel one-click
> deploy. Gojli already had its own auth, pricing page, and dashboard, so
> this integration was built directly into the existing codebase instead —
> `lib/paddleConfig.ts` is this app's equivalent of the starter kit's
> `pricing-tier.ts`. The Paddle-*account*-side setup (creating products,
> website approval, webhook destinations) is identical either way; only
> where the code lives differs.

## The flow, end to end

1. A logged-in user clicks **Upgrade to Pro/Business** on `/pricing`.
2. `PaddleCheckoutButton` opens Paddle's hosted checkout overlay (Paddle.js),
   passing the Supabase user's ID as `customData` so Paddle can hand it back
   to us later — Paddle has no concept of our own user IDs otherwise.
3. The user pays. Paddle creates a **subscription** and a **transaction**,
   then calls our webhook for each.
4. `app/api/webhooks/paddle/route.ts` verifies the webhook's signature, then:
   - On `subscription.created` / `subscription.updated` / `subscription.canceled`
     → updates `profiles.plan` (the actual source of truth the rest of the
     app already reads via `lib/usageLimits.ts`'s `getUserPlan()`).
   - On `transaction.completed` → sends the purchase-confirmation email.
5. The user is redirected back to Gojli; their dashboard now shows the new
   plan, a renewal date, and links to manage/cancel the subscription.

No code anywhere else in the app needed to change — `profiles.plan` was
already the single value every plan-gated feature reads (`lib/planLimits.ts`,
the office-conversion quota, etc.), so Paddle just becomes a new way that
column gets updated, alongside the existing admin-panel manual override
(`app/admin/users/actions.ts`'s `updateUserPlan`).

## Files

| File | Role |
|---|---|
| `lib/paddleConfig.ts` | Single source of truth mapping Gojli's plan IDs (`pro`/`business`) to Paddle price IDs, and the reverse lookup the webhook needs. Change price IDs here (or their env vars) — nothing else needs to change. |
| `components/PaddleCheckoutButton.tsx` | Client component. Loads Paddle.js once per page (`initializePaddle`), then opens the checkout overlay for a given plan/interval on click. Redirects to `/login` first if the visitor isn't signed in. |
| `components/PricingSection.tsx` | The pricing cards. Pro/Business buttons are now `PaddleCheckoutButton`s instead of disabled placeholders; shows "Current Plan" instead of a buy button if the visitor already has that plan. |
| `app/pricing/page.tsx` | Server Component — fetches the current user (if any) and their plan server-side, passes `userId`/`userEmail`/`currentPlan` down to `PricingSection`. `force-dynamic` since it depends on the session. |
| `app/api/webhooks/paddle/route.ts` | The webhook endpoint. Verifies the `paddle-signature` header via `@paddle/paddle-node-sdk`, then syncs `profiles.plan` and sends the confirmation email. **This is the actual source of truth for plan changes** — the checkout button only *starts* a purchase, it never grants a plan itself. |
| `lib/email.ts` | `purchaseConfirmationEmail()` added here (matches the existing `welcomeEmail`/`ticketReplyEmail` pattern) — sent from the webhook on `transaction.completed`. Design mirrors `email-templates/purchase-confirmation.html`. |
| `components/DashboardContent.tsx` + `app/dashboard/page.tsx` | Shows the current plan's renewal date and "Update Payment Method" / "Cancel Subscription" links (straight to Paddle's own hosted pages — no custom cancel flow was built) when the profile has them. |
| `docs/paddle-schema.sql` | Adds the Paddle-related columns to `profiles`. Run this once in Supabase's SQL editor. |

## Database

`docs/paddle-schema.sql` adds to the existing `profiles` table:

| Column | Set by | Purpose |
|---|---|---|
| `paddle_customer_id` | webhook | Paddle's customer ID for this user. |
| `paddle_subscription_id` | webhook | Paddle's subscription ID. |
| `paddle_subscription_status` | webhook | `active` / `trialing` / `past_due` / `paused` / `canceled` (Paddle's own enum, stored as-is for reference/debugging). |
| `plan_renews_at` | webhook | Shown on the dashboard as "Renews on ...". |
| `paddle_cancel_url`, `paddle_update_payment_method_url` | webhook | Direct links to Paddle's hosted self-service pages for this specific subscription. |

`profiles.plan` itself already existed (used everywhere else in the app) —
the webhook is just a new writer of it, exactly like the admin panel's manual
plan override already was.

## Setting it up

### 1. Paddle dashboard (do this in Sandbox first)

1. Sign up / log in at [sandbox-login.paddle.com/signup](https://sandbox-login.paddle.com/signup)
   for a **Sandbox** account while testing (a separate account from any live
   Paddle account — sandbox and live price/product IDs never cross over).
2. **Catalog → Products**: create "Gojli Pro" and "Gojli Business", each with
   a monthly and a yearly **price**. Prices must be **recurring**, not
   one-off, or Paddle won't create a subscription on checkout. Copy each
   price's ID (`pri_...`) — real IDs look like `pri_01h...`, not a plain
   dollar amount.
3. **Developer Tools → Authentication**:
   - **Client-side tokens** tab → new token → `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`
     (starts `test_` for sandbox, `live_` for a live account).
   - **API keys** tab → new key. Needs at least **Subscription: Write**
     (the webhook cancels/reads subscriptions) and **Transaction: Read**
     → `PADDLE_API_KEY` (starts `pdl_sdbx_apikey_` for sandbox).
4. **Developer Tools → Notifications**: add a destination pointing at
   `https://www.gojli.com/api/webhooks/paddle` (or your dev tunnel URL while
   testing locally — see below), subscribed to at least:
   `subscription.created`, `subscription.updated`, `subscription.canceled`,
   `transaction.completed`. Copy its **endpoint secret key**
   (`pdl_ntfset_...`) → `PADDLE_WEBHOOK_SECRET`.
5. **Checkout → Website approval**: add your domain (`gojli.com`, or the
   Vercel/dev-tunnel URL while testing) and submit. **Checkout silently
   refuses to open for an unapproved domain** — sandbox approval is instant,
   a live account can take Paddle's team a few days to review.
6. **Checkout → Checkout settings → Default payment link**: set this to your
   domain too. Paddle uses it for the "manage your subscription" links it
   sends in its own emails.

### 2. Environment variables

All of them are documented with inline comments in `.env.local` already —
fill in the blank ones. `NEXT_PUBLIC_PADDLE_ENV` must say `"sandbox"` while
using sandbox values, `"production"` once you switch to a live Paddle
account and live keys/price IDs.

### 3. Database

Run `docs/paddle-schema.sql` once against your Supabase project's SQL editor.

### 4. Testing locally

Paddle needs to reach your webhook over the public internet, so `localhost`
won't work directly — use a tunnel (e.g. `ngrok http 3000`) and point the
Paddle Sandbox notification destination at the tunnel's URL while testing,
and add that same tunnel URL under Website approval (step 5 above). Paddle's
dashboard also has a **Simulate** feature under Notifications for firing a
specific event at your endpoint without a real checkout.

Use these test card details in the sandbox checkout — no real charge happens:

| Field | Value |
|---|---|
| Email | any email you can access |
| Card number | `4242 4242 4242 4242` |
| Name on card | any name |
| Expiration date | any future date |
| Security code | `100` |

**Troubleshooting** — if checkout doesn't open, or the page just shows
"Something went wrong", open the browser console (Paddle.js logs its own
errors there) and check:

- The domain you're testing on is **Website approval**'d in Paddle (step 5) —
  the single most common reason checkout silently refuses to open.
- `NEXT_PUBLIC_PADDLE_PRICE_*` env vars are real `pri_...` IDs, not prices —
  a plain number there fails silently rather than throwing a clear error.
- `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` matches the environment (`test_` prefix
  for sandbox) and `NEXT_PUBLIC_PADDLE_ENV` matches which dashboard the price
  IDs/tokens came from — mixing sandbox IDs with `production` env (or vice
  versa) fails since sandbox and live catalogs are entirely separate.
- The webhook notification destination URL is reachable and exactly matches
  `.../api/webhooks/paddle` — check Paddle's Notifications log (under the
  destination) for delivery attempts and their response codes.

### 5. Going live

Switch to a real (non-sandbox) Paddle account, redo steps 1–2 with live
values, set `NEXT_PUBLIC_PADDLE_ENV="production"`, and point the webhook
notification destination at `https://www.gojli.com/api/webhooks/paddle`.

## What this does not do (yet)

- **No custom cancel/upgrade-downgrade UI** — "Cancel Subscription" and
  "Update Payment Method" link straight to Paddle's own hosted pages
  (`subscription.managementUrls`). Switching from Pro to Business (or vice
  versa) isn't wired up as a single in-app action; a user would cancel and
  re-subscribe. Paddle's `subscriptions.update()` API could add a proper
  "change plan" button later.
- **No proration/upgrade-preview UI** — Paddle handles proration
  automatically when a subscription is changed via its API, but there's no
  in-app preview of that; not needed since plan switching isn't built yet.
- **No admin-panel visibility** — the admin user-detail page
  (`app/admin/users/[id]/page.tsx`) doesn't show Paddle subscription info
  yet; an admin can still see/override `profiles.plan` directly as before.
- **Free trial** — not configured; every checkout charges immediately. Paddle
  supports trial periods on a price if that's wanted later.
