// Turnstile clearance-mint endpoint — the suite-wide Vercel edge handler.
// Re-exported from @aireon/shared so every app shares one implementation.
// This is the ONLY writer of the aireon_ts_clear cookie.
export { config, default } from '@aireon/shared/turnstile-verify';
