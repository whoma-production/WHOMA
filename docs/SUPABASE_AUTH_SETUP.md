# Supabase Auth Setup (Railway)

This project now uses Supabase Auth for public sign-in:

- Google OAuth
- Email magic link

Apple and email/password are intentionally disabled.

## 1) Railway Environment Variables

Add these on Railway (production and preview as needed):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_GOOGLE_AUTH_ENABLED=true
SUPABASE_EMAIL_AUTH_ENABLED=true
AUTH_URL=https://<your-railway-domain>
NEXT_PUBLIC_APP_URL=https://<your-railway-domain>
```

Notes:

- `AUTH_URL` and `NEXT_PUBLIC_APP_URL` should point to the same live host.
- Keep existing app vars (`DATABASE_URL`, support email vars, etc.) unchanged.

## 2) Supabase Auth Dashboard

In **Supabase Dashboard -> Authentication -> URL Configuration**:

- Site URL:
  - `https://<your-railway-domain>`
- Redirect URLs (add both):
  - `https://<your-railway-domain>/auth/callback`
  - `http://localhost:3000/auth/callback` (local)

In **Authentication -> Providers**:

- Google: enabled
- Email: enabled (magic link)
- Apple: disabled

## 3) Google OAuth Credentials

In **Google Cloud Console -> OAuth 2.0 Client**:

- Authorized redirect URI:
  - `https://<your-project-ref>.supabase.co/auth/v1/callback`

Then put the Google client credentials into:

- **Supabase Dashboard -> Authentication -> Providers -> Google**

WHOMA app code does not need `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` env vars anymore.

## 4) Email Magic Link Behavior

`Continue with email` uses Supabase magic links and returns through:

- `/auth/callback`

If you customize Supabase email templates, keep callback URL support intact.

## 5) Production Verification Checklist

1. Open `/sign-in`.
2. Verify only:
   - `Continue with Google`
   - `Continue with email`
3. Complete Google sign-in and confirm redirect into role/onboarding flow.
4. Send magic link and confirm callback sign-in works.
5. Confirm sign-out returns to `/sign-in`.
6. Confirm pending/denied agent accounts route to:
   - `/access/pending`
   - `/access/denied`
