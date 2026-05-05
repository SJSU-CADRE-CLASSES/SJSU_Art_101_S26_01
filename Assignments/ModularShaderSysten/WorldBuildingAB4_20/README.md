# World Building Portfolio

Next.js (App Router) + Supabase for user accounts, **sets** with slugs, and public performance URLs at `/p/[slug]`. The previous static Three.js demo still lives under `src/` to be wired into a client **player** component.

## Local development

1. **Environment:** copy `.env.local.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from **Supabase → Project Settings → API**. Restart `npm run dev` after saving. On **Vercel**, add the same variables to the project’s **Environment Variables** and **redeploy** after changing them. You can use `SUPABASE_URL` + `SUPABASE_ANON_KEY` instead (no `NEXT_PUBLIC_`); the login page reads them on the server and passes them to the browser so magic links work even if a past build lacked `NEXT_PUBLIC_*`.
2. Create a [Supabase](https://supabase.com) project if you do not have one yet.
3. **SQL**: run `supabase/migrations/20260419000000_init_sets.sql` in the Supabase SQL Editor (or use the Supabase CLI).
4. **Auth → URL configuration**
   - Site URL: `http://localhost:3000` (and your production URL later).
   - Redirect URLs: add `http://localhost:3000/auth/callback` and `https://<your-vercel-domain>/auth/callback`.
5. **Auth → Providers**: enable **Email** (magic link).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Login** for a magic link, then **Studio**.

## Vercel

- Import the repo and set the same env vars in the Vercel project settings.
- Add production redirect URLs in Supabase for `https://<project>.vercel.app/auth/callback`.

## Layout

| Path | Purpose |
|------|---------|
| `app/` | Next.js routes (home, login, studio, performance page) |
| `lib/supabase/` | Browser + server Supabase clients (SSR cookies) |
| `middleware.ts` | Refreshes auth session |
| `supabase/migrations/` | Postgres schema for `sets` |
| `src/` | Legacy shader/player code (to be imported by the player) |

## Troubleshooting

- **`webpack.js` / `main.js` / `_app.js` / `react-refresh.js` 404 in the browser:** Almost always **stale HTML or JS in the browser** (old tab, service worker, or disk cache) pointing at chunk names that no longer exist. **App Router** does not use `_app.js` / `_ssgManifest.js` like the old **Pages Router** — those 404s mean the document is not from your current `next dev`. Fix: stop the dev server, run `rm -rf .next`, run `npm run dev` again, then open the site in a **new incognito/private window** or clear **Cached images and files** for `localhost`. Use only **`http://localhost:3000`** (the Next app). The old static demo was moved to **`legacy/index.html`** so a root `index.html` cannot confuse tools or hosting.

- **`SES Removing unpermitted intrinsics` / `lockdown-install.js`:** Typically a **browser extension** (wallet / security tools), not this app.

- **`Cannot find module './611.js'` (or similar chunk errors):** stop the dev server, delete the build cache, and start again:
  ```bash
  rm -rf .next
  npm run dev
  ```
  Or use `npm run dev:clean` (same thing). Stale or interrupted builds often leave broken chunk references.

## Next steps

- Storage bucket for `.glsl` / `.pd` uploads.
- `manifest` JSON schema + compile pipeline (e.g. WebPd).
- Client **player** route that loads the current Three.js stack from `src/` using a set manifest.

## Controls schema (v1)

Each work can include a controls JSON file. See:

- `examples/example.controls.json`
- `lib/controls-schema.ts` (runtime validation + TypeScript types)

MIDI is described in the schema as **CC mappings** (WebMIDI). Wiring MIDI → uniforms in performance mode is the next step.
