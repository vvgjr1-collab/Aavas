import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native shell configuration.
 *
 * `webDir` is the Vite output directory, and the two settings that make the
 * existing build work unchanged inside the shell are already in place:
 * vite.config.ts sets `base: './'` for relative asset URLs, and the app uses a
 * HashRouter, so no server-side rewrite is needed. Capacitor serves the bundle
 * from a local origin, where both of those matter.
 */
const config: CapacitorConfig = {
  appId: 'com.aavas.app',
  appName: 'Aavas',
  webDir: 'build',
  android: {
    // Matches the light page ground (--background) so the brief moment before
    // the web view paints is not a white flash against a tinted UI.
    backgroundColor: '#f5f5f7',
  },
  plugins: {
    StatusBar: {
      // Dark glyphs on the light page ground; the landing page overrides this
      // at runtime (see src/native/index.ts).
      style: 'LIGHT',
      backgroundColor: '#f5f5f7',
    },
  },
};

export default config;
