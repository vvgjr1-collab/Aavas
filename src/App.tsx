import { HashRouter } from 'react-router-dom';
import { AppStateProvider } from './context/AppState';
import { AppRoutes } from './routes/AppRoutes';
import { Toaster } from './components/ui/sonner';

/**
 * Hash routing keeps the app deployable at any path (GitHub Pages project
 * subpath, a domain root, a local preview) with no server-side rewrite and no
 * basename baked into the build - matching base: './' in vite.config.ts.
 */
export default function App() {
  return (
    <HashRouter>
      <AppStateProvider>
        <AppRoutes />
        <Toaster />
      </AppStateProvider>
    </HashRouter>
  );
}
