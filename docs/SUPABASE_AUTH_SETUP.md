# Supabase Auth Setup (Railway)

This project now uses Supabase Auth for public sign-in.

Current production-safe posture:

- Email passwordless auth is the primary live path.
- Google OAuth should stay hidden until the provider is enabled and verified live in Supabase.
- Apple and email/password are intentionally disabled.

Preferred agent-onboarding flow:

- Email OTP in-page

Temporary fallback when OTP template work is incomplete:

- Email magic link

## 1) Railway Environment Variables

Add these on Railway (production and preview as needed):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_GOOGLE_AUTH_ENABLED=false
SUPABASE_EMAIL_AUTH_ENABLED=true
SUPABASE_EMAIL_AUTH_METHOD=otp
AUTH_URL=https://<your-railway-domain>
NEXT_PUBLIC_APP_URL=https://<your-railway-domain>
NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN=https://<your-railway-domain>
```

Notes:

- `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, and `NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN` should point to the same live host.
- Pick one canonical public app host and use it everywhere. Do not mix a Railway host, a marketing apex redirect, and a separate app subdomain across auth settings.
- Set `NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN` explicitly in each environment to prevent callback links from drifting to localhost.
- Keep existing app vars (`DATABASE_URL`, support email vars, etc.) unchanged.

## 2) Supabase Auth Dashboard

In **Supabase Dashboard -> Authentication -> URL Configuration**:

- Site URL:
  - `https://<your-railway-domain>`
- Redirect URLs (add both):
  - `https://<your-railway-domain>/auth/callback`
  - `http://localhost:3000/auth/callback` (local)

In **Authentication -> Providers**:

- Google: disabled until credentials are configured and one live round-trip succeeds
- Email: enabled
- Apple: disabled

If Google is not fully enabled yet, keep `SUPABASE_GOOGLE_AUTH_ENABLED=false` in the app env. WHOMA now preflights Google before launching OAuth, but the public UI should still reflect the real rollout state.

## 3) Google OAuth Credentials

In **Google Cloud Console -> OAuth 2.0 Client**:

- Authorized redirect URI:
  - `https://<your-project-ref>.supabase.co/auth/v1/callback`

Then put the Google client credentials into:

- **Supabase Dashboard -> Authentication -> Providers -> Google**

WHOMA app code does not need `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` env vars anymore.

## 4) Email OTP Behavior

WHOMA prefers email OTP for agent onboarding because it removes the extra inbox click-through and keeps completion in-page.

To make Supabase send a code instead of a link, update the hosted email template to use `{{ .Token }}` instead of `{{ .ConfirmationURL }}`.

`Continue with email` then works as:

- send code
- user enters the 6-digit code on the same WHOMA page
- Supabase verifies the code and creates the session

If you keep the default template, Supabase will continue sending magic links instead.

Magic-link callbacks still return through:

- `/auth/callback`

If you customize Supabase email templates, keep callback URL support intact for any remaining magic-link or OAuth flows.

## 5) Sign-in vs Sign-up

WHOMA now treats these as distinct public actions:

- `/sign-in` should not auto-create a new Supabase user
- `/sign-up` may create the user and continue into onboarding

This separation depends on `shouldCreateUser=false` for sign-in email requests and `true` for sign-up.

## 6) Lockouts and Support

- Supabase auth lockouts are not reset from the WHOMA admin UI.
- User-facing support can triage access issues, but auth rate limits are controlled in Supabase.
- If you are still on Supabase's built-in email provider, outbound auth emails are heavily rate-limited; production traffic should move to custom SMTP.

## 7) Production Verification Checklist

1. Open `/sign-in`.
   Use the same canonical host you configured above.
2. Verify only:
   - `Continue with email`
   - `Continue with Google` only if the provider is fully configured
3. For OTP mode:
   - request a code
   - confirm the 6-digit code form appears
   - verify the code and confirm redirect into role/onboarding flow
4. For magic-link fallback:
   - send magic link
   - confirm callback sign-in works
5. Confirm sign-out returns to `/sign-in`.
6. Confirm pending/denied agent accounts route to:
   - `/access/pending`
   - `/access/denied`
