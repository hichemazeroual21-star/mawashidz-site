# Logout session model

## Decision

MawashiDZ uses Supabase local-scope sign-out for the current device. The browser clears its local session and privilege context synchronously, then sends `POST /auth/v1/logout?scope=local` with the current access token. A network failure cannot restore the local session.

This is the accepted MVP model:

- local credentials disappear immediately;
- the current server-side session and its refresh token are revoked;
- an access JWT already issued remains cryptographically valid until its `exp` time;
- sensitive endpoints continue to rely on RLS, and any future operation requiring immediate revocation must also verify the JWT `session_id` against `auth.sessions` server-side.

The remaining JWT lifetime is a bounded, documented property—not a claim of instant token revocation. Live acceptance must record the configured access-token lifetime and reject an unexpectedly long value.

References: [Supabase sessions](https://supabase.com/docs/guides/auth/sessions) and [signOut](https://supabase.com/docs/reference/javascript/auth-signout).
