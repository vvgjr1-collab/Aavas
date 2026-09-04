import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';

import { isNative, syncStatusBar } from './index';

/**
 * Wires the app to the two Android behaviours a web build has no notion of.
 * Renders nothing, and does nothing at all in a browser.
 *
 * Must sit inside the Router: it uses useNavigate/useLocation.
 */
export function NativeShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // The listener is registered once, but it fires with whatever `navigate` is
  // current - a ref keeps the handler from closing over a stale one.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (!isNative()) return;

    let handle: PluginListenerHandle | undefined;
    let cancelled = false;

    // Without this, Android's back gesture exits the app from any screen -
    // including halfway through a rent payment - because the shell has no idea
    // the web view has its own history stack.
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) navigateRef.current(-1);
      else App.exitApp();
    }).then(h => {
      if (cancelled) h.remove();
      else handle = h;
    });

    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, []);

  useEffect(() => {
    void syncStatusBar(pathname);
  }, [pathname]);

  return null;
}
