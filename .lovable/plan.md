
Root cause identified (why it keeps coming back):
1) `.gitignore` currently has `.env*` (line 30), so `.env` is intentionally not tracked in git.
2) `src/integrations/supabase/client.ts` creates the backend client at module load using `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3) When a refresh/rebuild happens without those env values present, client creation throws immediately, causing the blank screen before React mounts (so ErrorBoundary cannot catch it).
4) That is why “fixing” by recreating `.env` is temporary: refresh/sync can remove it again.

Implementation plan (permanent fix):
1) Update `vite.config.ts` to use `defineConfig(({ mode }) => ...)` + `loadEnv(...)`.
2) Inject compile-time values for:
   - `import.meta.env.VITE_SUPABASE_URL`
   - `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`
   using priority:
   - real env values if present
   - stable fallback values if missing
3) Keep `.gitignore` as-is (do not rely on tracked `.env`, avoids future secret leakage risk).
4) Optionally add `.env.example` with the two public backend variables for local developer clarity (not required for runtime once step 2 is done).

Technical details:
- File to change: `vite.config.ts`
- Pattern:
  - `import { defineConfig, loadEnv } from "vite";`
  - resolve env inside config function
  - add `define` block mapping both `import.meta.env.*` keys via `JSON.stringify(...)`
- No change to auto-generated backend client file.
- No database/auth schema changes needed.

Verification plan:
1) Hard refresh `/login` in preview multiple times.
2) Publish and hard refresh `/login` on live URL.
3) Confirm app renders and no “supabaseUrl is required” runtime crash.
4) Confirm login/signup still works end-to-end.
