import { build } from 'esbuild';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire(import.meta.url);
const sass = require('../node_modules/sass-embedded');
const root = path.resolve('..');

const scssPlugin = {
  name: 'scss-module-as-global',
  setup(b) {
    b.onLoad({ filter: /\.module\.scss$/ }, args => {
      const out = sass.compile(args.path, {
        loadPaths: [path.dirname(args.path)],
        importers: [{ findFileUrl(u) { return u.startsWith('~') ? new URL('file://' + path.join(root, 'node_modules', u.slice(1))) : null; } }]
      });
      const css = out.css
        .replace(/:global\(([^)]*)\)/g, '$1').replace(/:global\s*/g, '')
        .replace(/~@fontsource\/[a-z]+\/files\//g, 'fonts/');
      return { loader: 'js', contents: `const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);export default {root:'root'};` };
    });
  }
};
await build({
  entryPoints: ['main.tsx'], bundle: true, outfile: 'preview/main.js', format: 'iife', sourcemap: false,
  jsx: 'transform', plugins: [scssPlugin], logLevel: 'info', define: { 'process.env.NODE_ENV': '"production"' },
  nodePaths: [path.join(root, 'node_modules')], absWorkingDir: path.resolve('.')
});

// assemble the static preview folder
fs.mkdirSync('preview/fonts', { recursive: true }); fs.mkdirSync('preview/media', { recursive: true });
for (const f of fs.readdirSync(path.join(root, 'provisioning/media'))) if (!f.endsWith('.json')) fs.copyFileSync(path.join(root, 'provisioning/media', f), path.join('preview/media', f));
for (const [pkg, files] of [['fraunces', ['600', '800']], ['figtree', ['400', '600']]])
  for (const w of files) { const n = `${pkg}-latin-${w}-normal.woff2`; fs.copyFileSync(path.join(root, 'node_modules/@fontsource', pkg, 'files', n), path.join('preview/fonts', n)); }
