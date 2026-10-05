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
        .replace(/~@fontsource\//g, '/spfx-anniversary-portal/node_modules/@fontsource/');
      return { loader: 'js', contents: `const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);export default {root:'root'};` };
    });
  }
};
await build({
  entryPoints: ['main.tsx'], bundle: true, outfile: 'dist/main.js', format: 'iife', sourcemap: false,
  jsx: 'transform', plugins: [scssPlugin], logLevel: 'info', define: { 'process.env.NODE_ENV': '"production"' },
  nodePaths: [path.join(root, 'node_modules')], absWorkingDir: path.resolve('.')
});
