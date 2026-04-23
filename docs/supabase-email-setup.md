# Supabase + Resend Email Branding Setup (WHOMA)

## Part 1 — Supabase Email Templates

1. Open Supabase Dashboard -> Authentication -> Email Templates.
2. Update each template Subject and Body as follows.

### Confirm Signup

Subject:

```text
Confirm your WHOMA account
```

Body:

```html
<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
  <p style="font-size: 13px; color: #666; margin-bottom: 24px;">WHOMA · Where Home Owners Meet Agents</p>
  <h2 style="font-size: 20px; font-weight: 600; color: #111; margin-bottom: 12px;">Confirm your email</h2>
  <p style="font-size: 15px; color: #444; margin-bottom: 24px;">
    Click below to activate your WHOMA account.
  </p>
  <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email"
     style="display: inline-block; background: #2d6a5a; color: white; padding: 12px 24px;
            border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 500;">
    Confirm email
  </a>
  <p style="font-size: 13px; color: #999; margin-top: 32px;">
    If you didn't create a WHOMA account, ignore this email.
  </p>
</div>
```

### Magic Link (keep in case needed)

Subject:

```text
Your WHOMA sign-in link
```

Body:

- Use the same HTML styling as the Confirm Signup template.
- Keep the same callback URL pattern.
- Swap button text to:

```text
Sign in to WHOMA
```

### Password Reset

Subject:

```text
Reset your WHOMA password
```

Body:

- Use the same HTML styling as the Confirm Signup template.
- Keep the same callback URL pattern for reset flow.
- Swap button text to:

```text
Reset password
```

3. Open Supabase Dashboard -> Authentication -> URL Configuration.
4. Confirm Site URL is:

```text
https://www.whoma.co.uk
```

## Part 2 — Resend Domain Verification

1. Go to [resend.com](https://resend.com) -> Domains -> Add domain -> `whoma.co.uk`.
2. Add the provided DNS TXT and MX records to your domain registrar.
3. After verification, use this sender address:

```text
WHOMA <support@whoma.co.uk>
```

4. Update `RESEND_API_KEY` in Railway environment variables.
