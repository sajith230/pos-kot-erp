

## Fix Build Error in Edge Function

### Problem
TypeScript error in `supabase/functions/invite-user/index.ts` line 107: `'err' is of type 'unknown'` when accessing `err.message`.

### Fix
**Modify: `supabase/functions/invite-user/index.ts`**
- Change the catch block to cast `err` before accessing `.message`:
```typescript
} catch (err) {
  const message = err instanceof Error ? err.message : "Unknown error";
  return new Response(JSON.stringify({ error: message }), {
```

Single-line fix in one file. No database changes.

