/**
 * Client for the restricted Kotlin bridge (see NativeBridge.kt).
 *
 * Transport, in order of preference:
 *  1. window.MonovraNative       — WebViewCompat.addWebMessageListener, origin-restricted
 *  2. window.MonovraNativeLegacy — @JavascriptInterface fallback for old WebViews
 *  3. dev mock                   — only in `vite dev`, never bundled into the APK
 */

const TIMEOUT_MS = 8000;
let seq = 0;
const pending = new Map();
const listeners = new Map();
let transport = null;

export class BridgeError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

function receive(raw) {
  let msg;
  try {
    msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return;
  }
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'response') {
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    clearTimeout(p.timer);
    if (msg.ok) p.resolve(msg.result);
    else p.reject(new BridgeError(msg.error?.code || 'INTERNAL', msg.error?.message));
  } else if (msg.type === 'event') {
    (listeners.get(msg.event) || []).forEach((fn) => {
      try {
        fn(msg.data);
      } catch (e) {
        console.error(e);
      }
    });
  }
}

export async function connect() {
  if (window.MonovraNative && typeof window.MonovraNative.postMessage === 'function') {
    const port = window.MonovraNative;
    port.addEventListener('message', (e) => receive(e.data));
    transport = { kind: 'native', send: (s) => port.postMessage(s) };
  } else if (window.MonovraNativeLegacy) {
    window.__monovraReceive = receive;
    transport = { kind: 'legacy', send: (s) => window.MonovraNativeLegacy.postMessage(s) };
  } else if (import.meta.env.DEV) {
    const { createMockNative } = await import('./dev/mock-native.js');
    const mock = createMockNative(receive);
    transport = { kind: 'mock', send: mock.send };
  } else {
    transport = null;
  }
  return transport?.kind ?? 'none';
}

export function call(method, params = {}) {
  if (!transport) return Promise.reject(new BridgeError('NO_BRIDGE', 'Native bridge unavailable'));
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new BridgeError('TIMEOUT', `${method} timed out`));
    }, TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer });
    transport.send(JSON.stringify({ id, method, params }));
  });
}

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, []);
  listeners.get(event).push(fn);
}
