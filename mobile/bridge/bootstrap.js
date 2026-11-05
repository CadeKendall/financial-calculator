import { createNativeStorage } from './storage.js';

const config = window.__BA_NATIVE__;
const send = message => window.ReactNativeWebView?.postMessage(JSON.stringify(message));
Object.defineProperty(window, 'localStorage', { value: createNativeStorage(config.storage, send) });
document.documentElement.classList.add('phone-shell', 'native-shell');
// WKWebView must behave like an app surface, including while focusing search.
document.querySelector('meta[name="viewport"]').content = 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
for (const type of ['gesturestart', 'gesturechange']) document.addEventListener(type, event => event.preventDefault(), { passive: false });
document.addEventListener('touchmove', event => { if (event.touches.length > 1) event.preventDefault(); }, { passive: false });
window.__setNativeInsets = insets => {
  for (const side of ['top', 'bottom', 'left', 'right']) document.documentElement.style.setProperty(`--safe-${side}`, `${Math.max(0, Number(insets[side]) || 0)}px`);
};
window.__setNativeInsets(config.insets);

let request = 0;
const pending = new Map();
window.__nativeReply = (id, ok) => { const item = pending.get(id); if (!item) return; clearTimeout(item.timer); pending.delete(id); ok ? item.resolve() : item.reject(new Error('Clipboard unavailable')); };
Object.defineProperty(navigator, 'clipboard', { value: { writeText(text) {
  return new Promise((resolve, reject) => {
    const id = ++request;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Clipboard timed out')); }, 5000);
    pending.set(id, { resolve, reject, timer }); send({ type: 'copy', id, text });
  });
} } });

document.addEventListener('calculator-hold-start', () => send({ type: 'hold', phase: 'start' }));
document.addEventListener('calculator-hold-cancel', () => send({ type: 'hold', phase: 'cancel' }));
document.addEventListener('calculator-hold-complete', () => send({ type: 'hold', phase: 'complete' }));
document.addEventListener('calculator-restarted', () => send({ type: 'hold', phase: 'complete' }));
document.addEventListener('click', event => {
  if (!event.defaultPrevented && event.target.closest('button:not(:disabled)')) send({ type: 'tap' });
});
document.addEventListener('visibilitychange', () => { if (document.hidden) send({ type: 'hold', phase: 'cancel' }); });
document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (link) { event.preventDefault(); send({ type: 'link', url: link.href }); }
});
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.createElement('button');
  toggle.type = 'button'; toggle.className = 'reset-theme native-haptics';
  let enabled = localStorage.getItem('ba-ii-plus-preview-v1-haptics') !== 'off';
  const refresh = () => { toggle.textContent = `Tactile feedback: ${enabled ? 'On' : 'Off'}`; toggle.setAttribute('aria-pressed', String(enabled)); send({ type: 'haptics', enabled }); };
  toggle.addEventListener('click', () => { enabled = !enabled; localStorage.setItem('ba-ii-plus-preview-v1-haptics', enabled ? 'on' : 'off'); refresh(); });
  document.querySelector('.back-panel').append(toggle); refresh();
  let previous = '';
  const updateTheme = () => {
    const style = getComputedStyle(document.documentElement);
    const colors = { type: 'theme', background: style.getPropertyValue('--app-case').trim(), ink: style.getPropertyValue('--app-case-ink').trim() };
    const next = JSON.stringify(colors); if (next !== previous) { previous = next; send(colors); }
  };
  new MutationObserver(updateTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  new MutationObserver(updateTheme).observe(document.querySelector('#calculator-back'), { attributes: true, attributeFilter: ['hidden'] });
  updateTheme(); send({ type: 'ready' });
});
window.addEventListener('error', () => send({ type: 'error', message: 'The calculator encountered a display error. Reload to recover your last saved session.' }));
