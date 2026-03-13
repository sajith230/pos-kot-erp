

## Fix: Allow `.env` to be tracked in Git

### Problem
Line 30 in `.gitignore` has `.env*` which excludes ALL `.env` files from git. This is why the `.env` file keeps disappearing after syncs, causing the blank white screen crash.

### Change

**`.gitignore`** — Replace line 30-31 with a more specific pattern that ignores secret env files but allows the base `.env` to be tracked:

```
.env.local
.env.*.local
.dev.vars*
!.dev.vars.example
```

This keeps `.env` tracked in git (so it syncs to GitHub and back), while still ignoring local override files like `.env.local` that might contain personal secrets.

Combined with the `vite.config.ts` fallback already in place, this provides a double safety net against the recurring blank screen issue.

### Notes
- The `.env` file only contains public/publishable keys (the anon key and project URL), so it's safe to commit.
- This is a one-line change in `.gitignore`.

