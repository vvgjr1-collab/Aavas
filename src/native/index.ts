import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Everything in this module is a no-op in a browser.
 *
 * The same bundle is served by GitHub Pages and by the Android shell, so each
 * entry point guards on `isNative()` rather than assuming a plugin is there.
 * The web implementations of these plugins exist but do not support the events
 * used here, so calling them unguarded would throw at runtime on the web.
 */
export const isNative = () => Capacitor.isNativePlatform();

/**
 * The landing page is near-black and every other screen sits on #f5f5f7, so
 * the status bar has to flip with the route or its glyphs vanish into the
 * background.
 *
 * Style.Light means light *content* (white glyphs) for a dark background;
 * Style.Dark is the reverse. The names read backwards until you know that.
 */
export async function syncStatusBar(pathname: string) {
  if (!isNative()) return;
  const onDarkScreen = pathname === '/';
  try {
    await StatusBar.setStyle({ style: onDarkScreen ? Style.Light : Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({
        color: onDarkScreen ? '#080b1f' : '#f5f5f7',
      });
    }
  } catch {
    // A missing or unavailable status bar is not worth failing a render over.
  }
}
