

## Fix: Remove Cloudflare Vite Plugin Breaking Preview

### Problem
The `@cloudflare/vite-plugin` (and associated `wrangler.jsonc`) is causing the live preview to fail. Lovable's preview server cannot run Cloudflare Workers locally.

### Changes

**1. Modify `vite.config.ts`**
- Remove the `cloudflare()` plugin import and usage
- Keep everything else intact

**2. No other files need changing** — `wrangler.jsonc` and the devDependency can remain harmless, but the plugin must not be active in the Vite config.

### Result
Preview will start normally with standard Vite dev server.

