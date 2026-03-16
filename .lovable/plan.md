

## Update `.gitignore` to track `.env`

### Change
Replace lines 30-31 in `.gitignore`:

**Before:**
```
.env*
!.env.example
```

**After:**
```
.env.local
.env.*.local
```

This allows the base `.env` file (containing only public keys) to be committed to GitHub, preventing the recurring blank screen issue. Local override files like `.env.local` remain ignored.

