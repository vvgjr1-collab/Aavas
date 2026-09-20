import { forwardRef, useImperativeHandle, useRef } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';

import { captchaEnabled, captchaSiteKey } from '../../lib/captcha';

export interface CaptchaHandle {
  /** Throw away a spent token and show a fresh challenge. */
  reset: () => void;
}

/**
 * The captcha on an auth form, or nothing at all.
 *
 * Renders only when a site key is configured, so a build without one behaves
 * exactly as it did before rather than showing an empty box where a widget
 * should be.
 *
 * A token is single use and short lived. Supabase consumes it on the way in,
 * so a failed sign-in leaves the form holding a token the server will refuse
 * the second time - which looks like the password being wrong twice. Every
 * caller resets after an attempt, successful or not.
 */
export const CaptchaField = forwardRef<CaptchaHandle, {
  onToken: (token: string | null) => void;
  /** Sent to hCaptcha so the challenge matches the surrounding page. */
  theme?: 'light' | 'dark';
}>(function CaptchaField({ onToken, theme = 'light' }, ref) {
  const widget = useRef<HCaptcha>(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      widget.current?.resetCaptcha();
      onToken(null);
    },
  }));

  if (!captchaEnabled) return null;

  return (
    <div className="flex justify-center">
      <HCaptcha
        ref={widget}
        sitekey={captchaSiteKey}
        theme={theme}
        onVerify={token => onToken(token)}
        // A token expires after a couple of minutes. Clearing it means the
        // form asks again rather than submitting something already stale.
        onExpire={() => onToken(null)}
        onError={() => onToken(null)}
      />
    </div>
  );
});
