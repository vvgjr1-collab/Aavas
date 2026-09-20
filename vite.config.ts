
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react-swc';
  import tailwindcss from '@tailwindcss/vite';
  import path from 'path';
  import { loadEnv, type Plugin } from 'vite';

  /**
   * A Content Security Policy, injected as a meta tag.
   *
   * GitHub Pages serves static files and cannot set response headers, so the
   * meta form is the only one available. It covers everything that matters
   * here except frame-ancestors, which is header-only - clickjacking is the
   * one thing this cannot address.
   *
   * The Supabase origin is read from the environment rather than hardcoded, so
   * a fork pointing at a different project gets a policy that matches it. With
   * no backend configured the connect rule falls back to 'self', which is
   * correct for a guest-only build.
   */
  function contentSecurityPolicy(mode: string): Plugin {
    const env = loadEnv(mode, process.cwd(), '');
    const url = env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '') ?? '';
    const api = url ? ` ${url}` : '';
    const socket = url ? ` ${url.replace(/^https:/, 'wss:')}` : '';

    // hCaptcha loads a script, opens the challenge in an iframe and calls
    // home, so it needs a hole in four directives. The hole is opened only
    // when a site key is configured: a build with no captcha keeps the tighter
    // policy, and the widget is one of the things that fails *silently* under
    // CSP - no error, just a box that never appears.
    const captcha = env.VITE_HCAPTCHA_SITE_KEY?.trim()
      ? ' https://hcaptcha.com https://*.hcaptcha.com'
      : '';

    const policy = [
      "default-src 'self'",
      // No inline script is emitted, so this can stay strict - which is what
      // makes the policy worth having at all.
      `script-src 'self'${captcha}`,
      // Tailwind and the animation library both write inline styles.
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com${captcha}`,
      "font-src 'self' data: https://fonts.gstatic.com",
      `img-src 'self' data: blob: https://images.unsplash.com${api}`,
      `connect-src 'self' data:${api}${socket}${captcha}`,
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      captcha ? `frame-src${captcha}` : "frame-src 'none'",
    ].join('; ');

    return {
      name: 'aavas-csp',
      transformIndexHtml(html) {
        return html.replace(
          '<head>',
          `<head>
    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
        );
      },
    };
  }

  export default defineConfig(({ mode }) => ({
    plugins: [react(), tailwindcss(), contentSecurityPolicy(mode)],
    // Relative asset URLs, so the build works from any path: the GitHub Pages
    // project subpath (/Aavas/), a domain root, or a local preview. Safe
    // alongside routing because the app uses a HashRouter, which needs no
    // basename and no server-side rewrite.
    base: './',
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
    },
    server: {
      port: 3000,
      open: true,
    },
  }));