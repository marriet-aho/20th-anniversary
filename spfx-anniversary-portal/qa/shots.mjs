// Usage: node shots.mjs [width] [query] [out-name] [colorScheme] [reducedMotion]
import { chromium } from 'playwright-core';
import fs from 'fs';
import http from 'http';
import path from 'path';

const [, , w = '1440', q = '', name = 'shot', scheme = 'light', rm = 'no-preference'] = process.argv;
const root = path.resolve('../..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(root, u === '/' ? '/spfx-anniversary-portal/qa/preview/index.html' : u);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  const size = fs.statSync(f).size, type = mime[path.extname(f)] || 'application/octet-stream';
  const r = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
  if (r) { const s = +r[1] || 0, e = r[2] ? +r[2] : size - 1; res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${s}-${e}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': e - s + 1 }); fs.createReadStream(f, { start: s, end: e }).pipe(res); }
  else { res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' }); fs.createReadStream(f).pipe(res); }
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: 900 }, colorScheme: scheme, reducedMotion: rm });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
await page.route('**/getpreview.ashx**', r => r.fulfill({ path: path.join(root, 'spfx-anniversary-portal/provisioning/media/hero-celebration-poster.webp'), contentType: 'image/webp' }));
await page.goto(`http://localhost:${port}/spfx-anniversary-portal/qa/preview/index.html?notoolbar=1&${q}`);
await page.waitForSelector('header.hero', { timeout: 15000 });
// dismiss the entry overlay unless asked to keep it
if (!/overlay=1/.test(q)) { const b = page.locator('#ov .btn').first(); if (await b.count()) { await b.click(); await page.waitForTimeout(1100); } }
// scroll through so lazy sections mount
const H = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < H + 1500; y += 600) { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(150); }
await page.waitForTimeout(800);
await page.evaluate(() => scrollTo(0, 0));
await page.waitForTimeout(500);
fs.mkdirSync('shots', { recursive: true });
await page.screenshot({ path: `shots/${name}.png`, fullPage: true });
const secs = await page.locator('#app > div > header, #app > div > section, #app > div > footer').all();
let n = 0;
for (const s of secs) { n++; try { await s.scrollIntoViewIfNeeded(); await page.waitForTimeout(250); await s.screenshot({ path: `shots/${name}-${String(n).padStart(2, '0')}.png`, animations: 'disabled' }); } catch (e) { errors.push('shot ' + n + ': ' + e.message.split('\n')[0]); } }
const info = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
console.log(JSON.stringify({ name, ...info, errors }));
await browser.close(); server.close();
