## Paddle integration

When writing or modifying code that integrates with Paddle:

- Always check current Paddle documentation via the `paddle-docs` MCP server before suggesting code. The Paddle API and SDKs evolve frequently — do not rely on training data alone.
- Use the official Paddle SDK for the language in use:
  - Node.js → `@paddle/paddle-node-sdk`
  - Python → `paddle-python-sdk` (imports as `paddle_billing`)
  - Go → `github.com/PaddleHQ/paddle-go-sdk/v5`
  - PHP → `paddlehq/paddle-php-sdk`
- All development uses the sandbox environment. Sandbox API keys contain `_sdbx`; sandbox client-side tokens are prefixed with `test_`.
- Always verify webhook signatures before acting on the payload:
  - Node: `paddle.webhooks.unmarshal()`
  - Python: `Verifier().verify(request, secret)`
  - Go: `paddle.NewWebhookVerifier()` with `Middleware`
  - PHP: `(new Verifier())->verify($request, $secret)`
- For destructive account changes (updating prices, archiving products, canceling subscriptions), ask for explicit confirmation before calling the `paddle-sandbox` or `paddle-live` MCP server.
- Use `paddle-sandbox` by default. Only call `paddle-live` when the prompt explicitly mentions live, production, or real customer data.
- API keys and webhook secrets live in environment variables — never inline credentials into code.
