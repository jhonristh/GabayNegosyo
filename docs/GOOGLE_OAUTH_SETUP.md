# Google sign-in setup (Supabase OAuth)

The app uses **Supabase Auth's Google provider** (`signInWithOAuth({ provider: "google" })`). This is *not* Google's standalone Identity Services button, and that guide is not a drop-in replacement. The error `Unsupported provider: provider is not enabled` means the Google provider is switched off in the Supabase project the deployed site talks to. No frontend change can fix that; the steps below can.

## Steps

1. **Google Cloud → Google Auth Platform**: create/select a project and configure the OAuth consent screen (branding). Create an **OAuth client ID → Web application**.
2. **Authorized JavaScript origins**: add your production domain (e.g. `https://<your-domain>`), and `http://localhost:3000` only for development.
3. **Authorized redirect URIs**: paste the **Supabase Auth callback URL** shown in Supabase → Authentication → Sign In / Providers → Google (`https://<project-ref>.supabase.co/auth/v1/callback`). This is *not* your app's post-login URL.
4. **Supabase → Authentication → Sign In / Providers → Google**: enable it and enter the Google **Client ID** and **Client Secret** *in the Supabase dashboard only*.
5. **Supabase → Authentication → URL Configuration**: set **Site URL** to the deployed site; add exact **Redirect URLs** (see `SUPABASE_REDIRECT_SETUP.md`).
6. **Vercel → Environment Variables**: set `NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN=true` (and `NEXT_PUBLIC_SITE_URL`), then redeploy.
7. **Test**: success, cancelling on Google's screen, provider disabled (button should show a friendly message, not JSON), and a redirect URL not in the allow-list.

## What the code does
- `lib/auth.tsx → loginWithGoogle()` builds `redirectTo` with `authRedirectUrl("/login")` (validated `NEXT_PUBLIC_SITE_URL`, allow-listed path, never localhost in production). On return, `/login` routes signed-in users on (new users to the wizard).
- Buttons are disabled while the redirect starts (no double clicks); failures use `friendlyAuthError`.
- The Google client secret never appears in source or in any `NEXT_PUBLIC_*` variable.

References: https://supabase.com/docs/guides/auth/social-login/auth-google · https://supabase.com/docs/guides/auth/redirect-urls
