/**
 * Turning what we hold about a person into something a device can act on.
 *
 * Both of these were written inline at each call site, and one of them was
 * written wrong: `/[^d+]/g` instead of `/[^\d+]/g`, a single missing
 * backslash, which strips every digit out of a phone number and hands the
 * dialler "tel:+". The page looked right, the button was enabled, and nothing
 * happened. Having it in one place with tests around it is the only reason
 * that class of typo gets caught at all - it is invisible in review and
 * invisible on screen.
 */

/**
 * A phone number reduced to what a dialler will accept, or null if there is
 * no number here.
 *
 * Null rather than an empty string on purpose: the caller has to decide what
 * to do about a missing number, and an empty string invites it to build
 * "tel:" and hand the device nothing. It also absorbs the placeholder text
 * that has been stored in this field ("Not provided", "No number given") -
 * those have no digits, so they are correctly nothing.
 */
export function dialable(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return null;
  // A leading + is the only non-digit worth keeping: it carries the country
  // code, and dropping it makes an international number undialable.
  return /^\s*\+/.test(phone) ? `+${digits}` : digits;
}

/**
 * A mailto: URL, or null if this is not an address.
 *
 * The check is deliberately loose - one @, something either side, no spaces.
 * Anything stricter starts rejecting real addresses, and the mail client is
 * the one that actually has to accept it.
 */
export function mailtoHref(
  address: string | null | undefined,
  subject?: string,
): string | null {
  if (!address) return null;
  const trimmed = address.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return subject
    ? `mailto:${trimmed}?subject=${encodeURIComponent(subject)}`
    : `mailto:${trimmed}`;
}

/**
 * Hand a tel: or mailto: URL to the device.
 *
 * An anchor click rather than assigning location.href. Both work when a
 * handler is registered, but assigning location.href for a scheme the browser
 * cannot handle can leave the page in a half-navigated state, and some
 * browsers ignore it outright from a handler that has already awaited
 * something. A click on a real anchor is the path every browser supports.
 *
 * Nothing here can tell whether anything opened. A desktop browser with no
 * mail client registered does nothing at all, silently, and there is no event
 * for it - so callers should say what they tried to open rather than assume.
 */
export function openExternal(href: string): void {
  const a = document.createElement('a');
  a.href = href;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
