---
name: drive-app
description: Launch the Aavas app and drive it in a real browser to verify a change - route rendering, navigation, keyboard/ARIA behaviour, and before/after screenshots. Use when asked to run the app, check that a change works in the real UI, take screenshots, or verify accessibility or routing. Also use before and after any styling change.
---

# Driving the Aavas app

`npm run typecheck` and `npm run build` prove the code compiles. They do not
prove the app works: a wrong route path, a dead click handler, a dropped ref or
a collapsed layout all build cleanly. Drive the real thing.

This uses headless Chrome over the DevTools Protocol. There are **no npm
dependencies** - Node 18+ ships a global `WebSocket` and `fetch`.

## Launch

```bash
# 1. build and serve
npm run build
npx vite preview --port 4173 --strictPort &   # serves at / (base is './')

# 2. headless Chrome with the debug port
"/c/Program Files/Google/Chrome/Application/chrome.exe" \
  --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
  --window-size=1280,1400 \
  --remote-debugging-port=9222 \
  --user-data-dir="$CLAUDE_JOB_DIR/tmp/chrome-profile" about:blank &
```

Tear down with `taskkill //F //IM chrome.exe` and `pkill -f "vite preview"`.
Chrome keeps a lock on files in its profile dir for a moment after exit, so a
`rm -rf` of it may report "Device or resource busy" - harmless.

## Verify

```bash
# every route + guards + navigation + a11y + tab keyboard support
node .claude/skills/drive-app/scripts/smoke.js

# same, against production
node .claude/skills/drive-app/scripts/smoke.js https://vvgjr1-collab.github.io/Aavas

# before/after screenshots for a styling change
node .claude/skills/drive-app/scripts/shots.js "$CLAUDE_JOB_DIR/tmp/shots" before
#   ...make the change, rebuild...
node .claude/skills/drive-app/scripts/shots.js "$CLAUDE_JOB_DIR/tmp/shots" after
```

Then **look at the screenshots**. A blank frame is a failed capture, not a pass.

`scripts/cdp.js` is the reusable client (`connect()` gives `evaluate`, `load`,
`hash`, `clickText`, `mouseClick`, `press`, `screenshot`; `checker()` gives
`check`/`report`). Require it directly for a one-off check rather than editing
the smoke test.

## Gotchas this repo has actually hit

**A hash-only URL change is a same-document navigation.** The route component
does not remount, so anything read once at mount - `useState(initialTab)` from a
`?tab=` param - keeps its old value. Always go via `about:blank` between loads;
`load()` does this for you. This also means driving `location.hash` directly is
not equivalent to a fresh visit.

**`--screenshot` fires before React renders**, giving a blank white PNG, and
`--virtual-time-budget` does not help it. Capture via CDP `Page.captureScreenshot`
after an explicit wait instead - that is what `screenshot()` does.
`--dump-dom --virtual-time-budget=9000` *is* fine for DOM-only assertions.

**Radix primitives do not use `onClick`.** Tabs, DropdownMenu and friends
activate on `mousedown`/`focus`. A synthetic `el.click()` silently does nothing;
use `mouseClick()`, which dispatches real `Input.dispatchMouseEvent` presses.

**Radix `asChild` needs the child to forward refs.** A plain function component
drops the ref and anything depending on the DOM node - roving focus, arrow-key
navigation, popover positioning - stops working with no error. `ui/button.tsx`
forwards refs for this reason; `ui/input.tsx` and `ui/textarea.tsx` still do not.

**Assert on text the app actually renders.** A field used only as a React `key`
(`payment.id`) never reaches the DOM.

**Local preview serves at `/`, GitHub Pages serves at `/Aavas/`.** `base: './'`
plus HashRouter is what makes both work; the smoke test takes a base URL so the
same checks run against either.

**The unauthenticated GitHub API allows 60 requests/hour.** Polling a deploy in
a tight loop exhausts it; `curl -s https://api.github.com/rate_limit` shows what
is left.

## Interpreting results

A consistent viewport-height delta across *every* screenshot points at a
spacing or control-height regression, not a content change. When wrapping
existing markup in a Radix primitive with `asChild`, both class sets land on the
element and Tailwind's merge does not run across that boundary - a stray `p-0`
or `h-9` in the wrapper's className will quietly win.
