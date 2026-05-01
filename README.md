## Environment Variables

Set these in Vercel Project Settings > Environment Variables:

```env
MINIMAX_API_KEY=...
MINIMAX_GROUP_ID=...
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` must be server-only. Do not expose it with `NEXT_PUBLIC_`.

## Supabase Table Setup

Run this SQL in Supabase SQL Editor:

```sql
create table if not exists public.stored_voices (
  voice_id text primary key,
  voice_name text not null,
  gender text null,
  description text null,
  created_at timestamptz not null default now()
);
```

## Behavior

- When clone confirm succeeds, app stores `voice_id` + `voice_name` (+ optional metadata) into `stored_voices`.
- `/api/voices` merges MiniMax voices with `stored_voices`, so saved character names still appear after changing API key/group.
- Deleting a voice also removes its record from `stored_voices`.
