# VTO — Week 1 setup (founder reference)

## 1. Connect Supabase (2 values)

Open [supabase.com/dashboard](https://supabase.com/dashboard) → your project →
**Settings (gear icon) → API**. Copy two things:

- **Project URL** (looks like `https://abcdefgh.supabase.co`)
- **anon public** key (a long string starting with `eyJ…`)

Paste them into the file `.env.local` in this folder, replacing the
placeholders. The anon key is safe to expose in the browser — that's what
it's for. Never put the `service_role` key anywhere in this project.

## 2. Create the scores table (one paste)

In the Supabase dashboard, left sidebar → **SQL Editor** → **New query**.
Open `supabase-setup.sql` from this folder, paste the whole thing, press
**Run**. You should see "Success. No rows returned." It's safe to run twice.

## 3. Recommended for beta testing

Supabase requires new users to confirm their email by default. For a
smoother beta: dashboard → **Authentication → Sign In / Providers →
Email** → turn **Confirm email** OFF. (Turn it back on before any public
launch.) If you leave it on, the app shows "check your email" after
sign-up, which also works.

## 4. Run locally

```
npm run dev
```

Then open http://localhost:3000 in **Chrome or Edge** (speech recognition
does not work in Safari or Firefox — the app shows a "Needs Chrome" screen
there, by design).

## Common errors

- **"score sync offline" red banner in the drills** → step 2 wasn't run,
  or the keys in `.env.local` are wrong. Restart `npm run dev` after
  editing `.env.local`.
- **"Invalid login credentials"** → wrong password, or the account was
  created but email not yet confirmed (see step 3).
- **Mic never prompts** → make sure the browser is Chrome/Edge and the
  page is localhost or https (mic is blocked on plain http otherwise).

## Where things live (for future weeks)

- `lib/engine/` — shared engine: text matching, audio, speech provider,
  score store. `speech.ts` has `getSpeechProvider()`: the week-2 cloud STT
  swap point (ElevenLabs / Deepgram / Azure implement `SpeechProvider`).
- `lib/drills/` — drills as plugins (speedrun.ts, pace.ts), ported
  verbatim from the prototype. Scoring rules live here.
- `components/DrillHost.tsx` — the shell that mounts one drill at a time.
- `supabase-setup.sql` — database schema. One row per banked run;
  personal bests are computed from it.
