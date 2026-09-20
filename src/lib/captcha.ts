/**
 * hCaptcha, on the forms Supabase will refuse without it.
 *
 * Turning on captcha protection in the Supabase dashboard makes the server
 * reject every sign-in, sign-up and password-recovery request that arrives
 * without a token - including the ones this app was sending. There is no
 * partial state: the moment it is enabled, nobody can sign in until the client
 * sends a token too.
 *
 * The site key is public by design - it is handed to the browser so the widget
 * can render, and it is visible in the page either way. The *secret* key is a
 * different value, it lives only in the Supabase dashboard, and it must never
 * appear here or in any VITE_ variable.
 */

const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY?.trim() ?? '';

/**
 * Whether this build should present a captcha.
 *
 * With no key configured the forms render exactly as they did before and send
 * no token, which is correct for a project that has not turned captcha on. It
 * also means this code can ship before the key is set without breaking
 * anything.
 */
export const captchaEnabled = siteKey.length > 0;

export const captchaSiteKey = siteKey;

/**
 * Whether a failure was Supabase refusing the request for want of a token.
 *
 * Worth naming precisely, because the raw message ("captcha protection:
 * request disallowed") reads as though the person failed a check they were
 * never shown.
 */
export function isMissingCaptchaError(message: string): boolean {
  return /captcha/i.test(message) && /disallowed|missing|not found|required/i.test(message);
}
