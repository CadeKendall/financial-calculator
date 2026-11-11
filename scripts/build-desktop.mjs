// Builds one self-contained offline HTML file for the Windows desktop app.
// Output: desktop/generated/calculator.html (no server, no network, no external files).
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'desktop/generated');

// 1. Bundle the UI and the TypeScript engine into a single script.
const appBundle = (await build({
  entryPoints: [resolve(root, 'web/app.js')],
  bundle: true,
  write: false,
  format: 'iife',
  target: ['chrome120'],
  minify: true,
  plugins: [{
    name: 'calculator-engine',
    setup(b) {
      b.onResolve({ filter: /^\/dist\/index\.js$/ }, () => ({ path: resolve(root, 'src/index.ts') }));
    },
  }],
})).outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

// 2. Inline every stylesheet.
let html = await readFile(resolve(root, 'web/index.html'), 'utf8');
for (const [tag, path] of [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)]) {
  const css = await readFile(resolve(root, path.slice(1)), 'utf8');
  html = html.replace(tag, () => `<style>${css}</style>`);
}

// 3. Replace the module/import-map scripts with inline copies.
// Replacement callbacks keep literal $&, $` and $' in minified code from being
// treated as String.replace substitution patterns.
html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
// The desktop flag gives the window the same full-bleed layout as the phone app.
const desktopFlag = "window.__BA_DESKTOP__=true;document.documentElement.classList.add('desktop-shell');";
const desktopCss = await readFile(resolve(root, 'desktop/desktop.css'), 'utf8');
const phoneShell = await readFile(resolve(root, 'web/phone-shell.js'), 'utf8');
html = html.replace('</head>', () => `<style>${desktopCss}</style><script>${desktopFlag}</script><script>${phoneShell}</script></head>`);
html = html.replace('</body>', () => `<script>${appBundle}</script></body>`);

// 4. Check the delivered scripts survived insertion intact and still parse.
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
if (scripts.length !== 3 || scripts[2][1] !== appBundle) throw new Error('Desktop HTML has unexpected script contents.');
for (const [index, match] of scripts.entries()) new Script(match[1], { filename: `desktop-script-${index}.js` });

await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, 'calculator.html'), html, 'utf8');
console.log(`Bundled desktop calculator: ${Math.round(Buffer.byteLength(html) / 1024)} KB -> desktop/generated/calculator.html`);
