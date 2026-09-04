/**
 * Minimal Chrome DevTools Protocol client - no npm dependencies.
 *
 * Node 18+ ships a global WebSocket and fetch, so this needs nothing installed.
 * Used by the sibling scripts; require() it directly for one-off checks.
 */
const DEFAULT_PORT = 9222;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function connect({ port = DEFAULT_PORT, timeoutMs = 10000 } = {}) {
  const base = `http://localhost:${port}`;
  let wsUrl = null;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const list = await (await fetch(base + '/json')).json();
      const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) { wsUrl = page.webSocketDebuggerUrl; break; }
    } catch { /* chrome not up yet */ }
    await sleep(250);
  }
  if (!wsUrl) throw new Error(`no debuggable page on :${port} - is Chrome running with --remote-debugging-port?`);

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  };
  const send = (method, params = {}) => new Promise(res => {
    const n = ++id;
    pending.set(n, res);
    ws.send(JSON.stringify({ id: n, method, params }));
  });

  await send('Runtime.enable');
  await send('Page.enable');

  /** Evaluate an expression in the page and return its value. */
  const evaluate = async expression => (
    await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  ).result?.result?.value;

  /**
   * Load a URL with a FULL document load.
   * A hash-only change is a same-document navigation, so route components do
   * not remount and keep their existing state (a tab chosen from ?tab= would
   * not update). Going via about:blank forces a real mount.
   */
  const load = async (url, settleMs = 3200) => {
    await send('Page.navigate', { url: 'about:blank' });
    await sleep(300);
    await send('Page.navigate', { url });
    await sleep(settleMs);
  };

  const hash = () => evaluate('location.hash');

  /** Click the first <button>/<a> whose visible text contains `text`. */
  const clickText = async (text, settleMs = 700) => {
    const ok = await evaluate(`(() => {
      const want = ${JSON.stringify(text)}.toLowerCase();
      const el = [...document.querySelectorAll('button, a')]
        .find(e => (e.innerText || '').trim().toLowerCase().includes(want));
      if (!el) return false;
      el.click();
      return true;
    })()`);
    await sleep(settleMs);
    return ok;
  };

  /**
   * Real mouse press at an element's centre.
   * Prefer this over el.click() for Radix primitives: Tabs, DropdownMenu and
   * friends activate on mousedown/focus and define no onClick, so a synthetic
   * click() does nothing.
   */
  const mouseClick = async (selector, settleMs = 700) => {
    const box = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`);
    if (!box) return false;
    for (const type of ['mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
    }
    await sleep(settleMs);
    return true;
  };

  const KEYS = {
    ArrowRight: 39, ArrowLeft: 37, ArrowDown: 40, ArrowUp: 38,
    Home: 36, End: 35, Enter: 13, Escape: 27, Tab: 9, ' ': 32,
  };
  const press = async (key, settleMs = 600) => {
    const code = KEYS[key];
    for (const type of ['keyDown', 'keyUp']) {
      await send('Input.dispatchKeyEvent', {
        type, key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code,
      });
    }
    await sleep(settleMs);
  };

  /** Full-page PNG. Resizes the viewport to the document height first. */
  const screenshot = async (file, { width = 1280, maxHeight = 4000 } = {}) => {
    const fs = require('fs');
    const h = (await evaluate(`Math.min(document.body.scrollHeight, ${maxHeight})`)) || 1400;
    await send('Emulation.setDeviceMetricsOverride', { width, height: h, deviceScaleFactor: 1, mobile: false });
    await sleep(600);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    await send('Emulation.clearDeviceMetricsOverride');
    if (!shot.result?.data) throw new Error('screenshot failed');
    fs.writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
    return { file, width, height: h };
  };

  return { send, evaluate, load, hash, clickText, mouseClick, press, screenshot, close: () => ws.close() };
}

/** Tiny assertion helper; call report() at the end for an exit code. */
function checker() {
  const results = [];
  const check = (label, actual, expected) => {
    const pass = JSON.stringify(actual) === JSON.stringify(expected);
    results.push(pass);
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}`);
    if (!pass) console.log(`        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    return pass;
  };
  const report = () => {
    const passed = results.filter(Boolean).length;
    console.log(`\n${passed}/${results.length} checks passed`);
    return passed === results.length ? 0 : 1;
  };
  return { check, report };
}

module.exports = { connect, checker, sleep };
