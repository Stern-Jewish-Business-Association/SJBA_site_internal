# Local Admin Safety

The admin panel can run locally with `npm run dev` for development and production inspection.

Local development must never accidentally write to the production database. The app therefore runs a
startup safety check before mounting admin data screens.

## Local Read-Only Mode

When the admin panel is running in Vite dev mode, it becomes read-only if any safety check indicates
that production data may be involved.

Read-only mode still allows authenticated admins to view production data through backend `GET`
routes. It disables all write capabilities in the UI:

- create
- edit/save
- delete
- storage upload
- storage replace/move
- storage delete

The app also shows an always-visible banner at the top of the dashboard explaining that production
data is visible for inspection but write actions are disabled.

## What Triggers Read-Only Mode

Local dev mode becomes read-only when:

- `VITE_BACKEND_URL` points at `api.nyu-sjba.org`
- `VITE_SUPABASE_URL` points at the production Supabase project
- backend `/health` reports `environment: "production"`
- backend `/health` reports a production Supabase/database target
- backend `/health` cannot be reached or parsed
- backend `/health` does not expose Supabase target metadata

The final rule is deliberate. A local backend can run with `environment: "development"` while its
`.env` points at production Supabase. Without explicit backend Supabase target metadata, the admin
panel cannot prove writes are safe, so it keeps the local dashboard read-only.

## Backend Metadata Required For Local Writes

To enable local write testing, the backend `/health` response must include non-secret Supabase target
metadata showing that it is not connected to production Supabase.

Expected shape:

```json
{
  "status": "healthy",
  "environment": "development",
  "supabase": {
    "url": "http://127.0.0.1:54321",
    "projectRef": "local",
    "environment": "local",
    "isProduction": false
  }
}
```

Never expose `SUPABASE_SECRET_KEY`, service-role keys, JWT secrets, or database passwords.

The production Supabase project ref is:

```text
ivhsrdfhjxtrxvrwswuk
```

If `/health` reports that project ref, or reports `isProduction: true`, local admin stays read-only.
