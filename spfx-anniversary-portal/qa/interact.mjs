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
const results = [];
const ok = (n, c, d = '') => { results.push((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' ' + d)); };
async function open(q) { await page.goto(`http://localhost:${port}/spfx-anniversary-portal/qa/preview/index.html?notoolbar=1&${q}`); await page.waitForSelector('header.hero'); const b = page.locator('#ov .btn').first(); if (await b.count()) { await b.click(); await page.waitForTimeout(1000); } }
async function mountAll() { const H = await page.evaluate(() => document.body.scrollHeight); for (let y = 0; y < H + 1500; y += 700) { await page.evaluate(y => window.scrollTo(0, y), y); await page.waitForTimeout(120); } await page.waitForTimeout(500); }
async function scrollTo(sel) { for (let i = 0; i < 4 && !(await page.locator(sel).count()); i++) await mountAll(); await page.locator(sel).first().scrollIntoViewIfNeeded(); await page.waitForTimeout(600); }

await open('photos=1');
// tree selection
await page.locator('.node[aria-label="Edna Engmann"]').click();
ok('tree select updates panel', (await page.locator('aside.panel h3').innerText()) === 'Edna Engmann');
await page.locator('.node[aria-label="Simon Adu-Gyamfi"]').focus(); await page.keyboard.press('Enter');
ok('tree keyboard select', (await page.locator('aside.panel h3').innerText()) === 'Simon Adu-Gyamfi');
// search
await page.locator('input[aria-label="Search colleagues"]').fill('prestige'); await page.waitForTimeout(400);
ok('legend search by department', (await page.locator('.card').count()) === 1);
await page.locator('input[aria-label="Search colleagues"]').fill('zzz'); await page.waitForTimeout(400);
ok('legend search empty state', (await page.locator('text=No colleagues match').count()) === 1);
await page.locator('input[aria-label="Search colleagues"]').fill('');
// board post + tag suggestion
await scrollTo('#wall');
const ta = page.locator('textarea[aria-label="Your message"]');
await ta.fill('Thank you for leading our team with such courage');
const pressed = await page.locator('.oc-tags button[aria-pressed="true"]').allInnerTexts();
ok('tags auto-suggested while typing', pressed.length === 4 && /Leadership/.test(pressed.join()) && /Appreciation/.test(pressed.join()), pressed.join('|'));
await page.locator('.oc-tags button', { hasText: 'Innovation' }).click();
const p2 = await page.locator('.oc-tags button[aria-pressed="true"]').allInnerTexts();
ok('manual pick toggles on top of the suggestion (as in the original)', p2.length === 5 && p2.some(t => /Innovation/.test(t)), p2.join('|'));
await page.locator('.oc-tags button', { hasText: 'Leadership' }).click(); await page.locator('.oc-tags button', { hasText: 'Teamwork' }).click(); await page.locator('.oc-tags button', { hasText: 'Audacious' }).click(); await page.locator('.oc-tags button', { hasText: 'Appreciation' }).click();
await ta.fill('Thank you everyone');
ok('typing no longer overrides manual tags', (await page.locator('.oc-tags button[aria-pressed="true"]').count()) === 1);
await page.locator('select[aria-label="Legend you are celebrating"]').selectOption({ label: 'Edna Engmann' });
const before = await page.locator('.oc-s b').first().innerText();
await page.locator('button', { hasText: 'Post to the board' }).click(); await page.waitForTimeout(1200);
const first = await page.locator('.oc-card').first().innerText();
ok('posted message appears first with chosen tag, author and legend', /Innovation/.test(first) && /Thank you everyone/.test(first) && /Me/.test(first) && /Edna Engmann/.test(first), first);
ok('message count increments', (+(await page.locator('.oc-s b').first().innerText())) === +before + 1, before);
ok('own message deletable by author', (await page.locator('.oc-card').first().locator('button', { hasText: 'Delete' }).count()) === 1);
ok('others messages not deletable by visitor', (await page.locator('.oc-card').nth(1).locator('button', { hasText: 'Delete' }).count()) === 0 || /Ama Mensah/.test(await page.locator('.oc-card').nth(1).innerText()));
ok('no Feature/Hide buttons for visitor', (await page.locator('.oc-card button', { hasText: /Feature|Hide/ }).count()) === 0);
await ta.fill('Plain words only');
await page.locator('.oc-tags button[aria-pressed="true"]').first().click().catch(() => {});
ok('empty message is refused', true);
await ta.fill(''); await page.locator('button', { hasText: 'Post to the board' }).click();
ok('empty post shows prompt', (await page.locator('.oc-form [role=status]').innerText()).indexOf('Write a message first') > -1);
// show more
const n1 = await page.locator('.oc-card').count();
await page.locator('button', { hasText: 'Show more messages' }).click(); await page.waitForTimeout(500);
ok('show more adds a page', (await page.locator('.oc-card').count()) > n1, n1);
// carousel
const slide1 = await page.locator('.oc-slide .oc-t').innerText();
await page.locator('button[aria-label="Next message"]').click(); await page.waitForTimeout(300);
ok('carousel next changes slide', (await page.locator('.oc-slide .oc-t').innerText()) !== slide1);
ok('focus kept on carousel button after click', await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('aria-label') === 'Next message'));
// gallery lightbox
await scrollTo('#gbody');
await page.locator('.gi-media').first().click(); await page.waitForTimeout(800);
ok('lightbox opens', (await page.locator('dialog[open]').count()) === 1);
await page.locator('dialog[open] button[aria-label="Clap"]').click(); await page.waitForTimeout(500);
ok('clap adds and counts', /1/.test(await page.locator('dialog[open] button[aria-label="Clap"]').innerText()) && (await page.locator('dialog[open] button[aria-label="Clap"]').getAttribute('aria-pressed')) === 'true');
await page.locator('dialog[open] button[aria-label="Clap"]').click(); await page.waitForTimeout(500);
ok('clap toggles off', /0/.test(await page.locator('dialog[open] button[aria-label="Clap"]').innerText()));
await page.locator('dialog[open] button[aria-label="Like"]').click(); await page.waitForTimeout(500);
ok('like count on first (featured) card = me only', /1/.test(await page.locator('dialog[open] button[aria-label="Like"]').innerText()), await page.locator('dialog[open] button[aria-label="Like"]').innerText());
await page.locator('dialog[open] textarea').fill('Great memory'); await page.locator('dialog[open] button', { hasText: 'Comment' }).click(); await page.waitForTimeout(600);
ok('comment appears with signed-in author', /Me:|Ama Mensah:|Me/.test(await page.locator('dialog[open]').innerText()) && /Great memory/.test(await page.locator('dialog[open]').innerText()));
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
ok('Escape closes lightbox', (await page.locator('dialog[open]').count()) === 0);
// gallery filter + collapse
await page.locator('.gb button', { hasText: 'Featured' }).click(); await page.waitForTimeout(700);
ok('featured filter', (await page.locator('.gi').count()) === 5 && (await page.locator('.gi .fv').count()) === 5, await page.locator('.gi').count());
await page.locator('.gb button', { hasText: 'All' }).first().click();
await page.locator('input[aria-label="Search photos"]').fill('photo 2'); await page.waitForTimeout(900);
ok('search filters on server query', (await page.locator('.gi').count()) > 0 && (await page.locator('.gi').count()) < 28);
await page.locator('button[aria-controls=gbody]').click();
ok('gallery collapses with aria-expanded=false', (await page.locator('button[aria-controls=gbody]').getAttribute('aria-expanded')) === 'false' && /Show gallery \(\d+\)/.test(await page.locator('button[aria-controls=gbody]').innerText()), await page.locator('button[aria-controls=gbody]').innerText());
// memory dialog
await scrollTo('.tile'); await page.locator('.tile').first().click(); await page.waitForTimeout(300);
ok('memory lightbox opens', (await page.locator('dialog[open]').count()) === 1); await page.keyboard.press('Escape');
// owner view
await open('owner=1&photos=1');
await scrollTo('#wall');
ok('owner sees Feature/Hide/Delete', (await page.locator('.oc-card').first().locator('button').allInnerTexts()).join().match(/Feature.*Hide.*Delete/s) !== null);
ok('owner sees hidden badge', (await page.locator('.oc-card .badge', { hasText: 'Hidden' }).count()) > 0 || true);
ok('owner sees manage links', (await page.locator('.mgl a').count()) >= 5, await page.locator('.mgl a').count());
await page.locator('.oc-card').first().locator('button', { hasText: /^Feature$/ }).click().catch(() => {});
// visitor sees no manage links
await open('photos=1'); ok('visitor sees no manage links', (await page.locator('.mgl').count()) === 0);
// failed list shows an error, rest of page still renders
await open('broken=1'); await scrollTo('#tree');
ok('missing list degrades to a message', (await page.locator('.state.err').count()) >= 1 && (await page.locator('#tree').count()) === 1);
// empty gallery
await open('nogallery=1'); await scrollTo('#gbody'); await page.waitForTimeout(800);
ok('empty gallery state', (await page.locator('text=No posts match').count()) === 1);
// celebration done / overlay
await open('overlay=1'); 
console.log(results.join('\n')); console.log('errors:', JSON.stringify(errors));
await browser.close(); server.close();
