<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/56c06695-2992-4336-8e33-df7f3d84e69d

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [`.env`](.env) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy On Render

As of March 26, 2026, Render still offers a free web service tier. This repo is now configured for Render with [render.yaml](./render.yaml).

1. Push this project to GitHub.
2. In Render, choose `New +` -> `Blueprint`.
3. Select your repository and deploy the blueprint.
4. Set any missing environment variables in Render:
   `GEMINI_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID`

Important:
- The app uses SQLite in `database/data/database.sqlite`.
- On Render free web services, the filesystem is ephemeral, so SQLite data can reset after redeploys/restarts.
- For persistent production data, move the database to an external service.

## Free Permanent Database Recommendation

For this codebase, `Supabase Postgres` is the recommended persistent database for deployments where the local filesystem is ephemeral.

Why Supabase fits this project:
- Managed Postgres with free tier options
- Works well for Render-style deployments where local disk is not permanent
- This repo keeps SQLite as the runtime query engine and mirrors snapshots to Supabase for persistence

### Supabase Setup

1. Create a Supabase project.
2. Copy the database connection string from Supabase -> Project Settings -> Database.
3. Set:
   - `SUPABASE_DB_URL`
   - `SUPABASE_DB_SSL` (keep `true` for Supabase)

### Migrate Local SQLite Data To Supabase

This repo now includes a migration script:

```bash
npm run db:migrate:supabase
```

If you want to wipe the target Supabase database tables before importing local data:

```bash
npm run db:migrate:supabase -- --replace
```

Current note:
- This patch adds Supabase migration tooling, schema bootstrap, and runtime mirror support.
- When `SUPABASE_DB_URL` is configured, the app now:
  - initializes Supabase schema
  - restores local SQLite from Supabase if the local database is empty
  - auto-syncs successful POST/PUT/PATCH/DELETE changes to Supabase

Current limitation:
- This is a practical persistence bridge for the existing SQLite-heavy codebase.
- It is much safer than pure local SQLite on ephemeral hosting, but it is not yet a full native Postgres query-layer rewrite.
- In multi-instance serverless environments, last-write-wins snapshot syncing can still cause conflicts under heavy concurrent writes.
