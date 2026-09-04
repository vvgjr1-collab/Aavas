import { HashRouter } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AppStateProvider } from './context/AppState';
import { AppRoutes } from './routes/AppRoutes';
import { Toaster } from './components/ui/sonner';
import { NativeShell } from './native/NativeShell';

/**
 * Hash routing keeps the app deployable at any path (GitHub Pages project
 * subpath, a domain root, a local preview) with no server-side rewrite and no
 * basename baked into the build - matching base: './' in vite.config.ts.
 *
 * MotionConfig sets the house transition (a soft decelerating curve, the same
 * one the CSS uses as --ease-out-soft) and honours "Reduce motion" in the OS,
 * which switches every Motion animation off at the source rather than leaving
 * CSS to paper over it.
 */
export default function App() {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <HashRouter>
        <AppStateProvider>
          {/* Android hardware back button and status-bar tinting. Inert on the
              web, where the same bundle is served by GitHub Pages. */}
          <NativeShell />
          <AppRoutes />
          <Toaster position="top-center" expand richColors />
        </AppStateProvider>
      </HashRouter>
    </MotionConfig>
  );
}
