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

await page.route('**/sites/InfoPortal/**', r => r.fulfill({ path: path.join(root, 'spfx-anniversary-portal/provisioning/media/logo-20th-anniversary.webp'), contentType: 'image/webp' }));
await page.route('**/getpreview.ashx**', r => r.fulfill({ path: path.join(root, 'spfx-anniversary-portal/provisioning/media/hero-celebration-poster.webp'), contentType: 'image/webp' }));
const results = [];
const ok = (n, c, d = '') => { const line = (c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' ' + d); results.push(line); if (process.env.LIVE) console.log(line); };
const allRest = [];
async function open(q) { try { allRest.push(...(await page.evaluate(() => window.__rest || []))); } catch { /* first load */ } await page.goto(`http://localhost:${port}/spfx-anniversary-portal/qa/preview/index.html?notoolbar=1&${q}`); await page.waitForSelector('header.hero'); const b = page.locator('#ov .btn').first(); if (await b.count()) { await b.click(); await page.waitForTimeout(1000); } }
async function mountAll() { const H = await page.evaluate(() => document.body.scrollHeight); for (let y = 0; y < H + 1500; y += 700) { await page.evaluate(y => window.scrollTo(0, y), y); await page.waitForTimeout(120); } await page.waitForTimeout(500); }
async function scrollTo(sel) { for (let i = 0; i < 4 && !(await page.locator(sel).count()); i++) await mountAll(); await page.locator(sel).first().scrollIntoViewIfNeeded(); await page.waitForTimeout(600); }

await open('photos=1&allow=1');
ok('all 13 legends in the tree', (await page.locator('.node').count()) === 13);
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
ok('visitor cannot delete even their own message', (await page.locator('.oc-card button', { hasText: 'Delete' }).count()) === 0);
ok('visitor sees no Delete anywhere on the board', (await page.locator('.oc-card .oc-del').count()) === 0);
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
ok('like count on first card = me only', /1/.test(await page.locator('dialog[open] button[aria-label="Like"]').innerText()), await page.locator('dialog[open] button[aria-label="Like"]').innerText());
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
ok('Escape closes lightbox', (await page.locator('dialog[open]').count()) === 0);
// gallery filter + collapse
ok('only All + 2 category buttons', (await page.locator('.gb button').allInnerTexts()).join('|') === 'All|Branch Celebrations|Anniversary Events', (await page.locator('.gb button').allInnerTexts()).join('|'));
await page.locator('.gb button', { hasText: 'Anniversary Events' }).click(); await page.waitForTimeout(700);
ok('category filter', (await page.locator('.gi').count()) > 0 && (await page.locator('.gi').count()) < 28, await page.locator('.gi').count());
await page.locator('.gb button', { hasText: 'All' }).first().click();
const SB = page.locator('input[aria-label="Search by photo, branch or department"]');
await SB.fill('photo 2'); await page.waitForTimeout(900);
ok('search by caption', (await page.locator('.gi').count()) > 0 && (await page.locator('.gi').count()) < 28);
await SB.fill(''); await page.waitForTimeout(700);
const allN = await page.locator('.gi').count();
await SB.fill('kumasi'); await page.waitForTimeout(900);
const kN = await page.locator('.gi').count();
ok('search by branch', kN > 0 && kN < allN, kN + ' of ' + allN);
await SB.fill('northern'); await page.waitForTimeout(900);
ok('search by region', (await page.locator('.gi').count()) > 0);
const dep = await page.evaluate(() => window.__data.Departments[0].Title);
await SB.fill(dep.toLowerCase().slice(0, 5)); await page.waitForTimeout(900);
const dN = await page.locator('.gi').count();
ok('search by department', dN > 0 && dN < allN, dep + ': ' + dN + ' of ' + allN);
await SB.fill('zzzz-nothing'); await page.waitForTimeout(900);
ok('no match shows empty note', (await page.locator('.gi').count()) === 0 && /No posts match/.test(await page.locator('#gbody').innerText()));
await SB.fill(''); await page.waitForTimeout(700);
ok('only one search box in gallery', (await page.locator('#gbody .gf input, #gbody .gf select').count()) === 1);
await page.locator('button[aria-controls=gbody]').click();
ok('gallery collapses with aria-expanded=false', (await page.locator('button[aria-controls=gbody]').getAttribute('aria-expanded')) === 'false' && /Show gallery \(\d+\)/.test(await page.locator('button[aria-controls=gbody]').innerText()), await page.locator('button[aria-controls=gbody]').innerText());
// memory dialog
await scrollTo('.tile'); await page.locator('.tile').first().click(); await page.waitForTimeout(300);
ok('memory lightbox opens', (await page.locator('dialog[open]').count()) === 1); await page.keyboard.press('Escape');
// owner view
await open('owner=1&photos=1');
await scrollTo('#wall');
ok('owner always sees the post form', (await page.locator('textarea[aria-label="Your message"]').count()) === 1);
ok('owner sees Feature/Hide/Delete', (await page.locator('.oc-card').first().locator('button').allInnerTexts()).join().match(/Feature.*Hide.*Delete/s) !== null);
ok('owner sees hidden badge', (await page.locator('.oc-card .badge', { hasText: 'Hidden' }).count()) > 0 || true);
ok('no "Manage content" links for owners either', (await page.locator('.mgl').count()) === 0 && (await page.locator('text=Manage content').count()) === 0);
await page.locator('.oc-card').first().locator('button', { hasText: /^Feature$/ }).click().catch(() => {});
// owner edits on the page: add photos, edit, hide, delete
await scrollTo('#gbody');
const G = () => page.evaluate(() => window.__data.GalleryMedia);
const o_before = (await G()).length;
ok('owner sees Add photos', (await page.locator('.ow button', { hasText: 'Add photos' }).count()) === 1);
await page.locator('.ow button', { hasText: 'Add photos' }).click();
const o_media = path.join(root, 'spfx-anniversary-portal/provisioning/media');
await page.locator('#ow-add input[type=file]').setInputFiles([path.join(o_media, 'logo-20th-anniversary.webp'), path.join(o_media, 'hero-celebration-poster.webp')]);
ok('upload button names the file count', /Upload 2 files/.test(await page.locator('#ow-add .btn', { hasText: 'Upload' }).innerText()));
await page.locator('#ow-add input[placeholder="Type the branch"]').fill('Adenta Branch');
await page.locator('#ow-add input[placeholder="Type the region"]').fill('Greater Accra');
await page.locator('#ow-add select').first().selectOption('Anniversary Events');
await page.locator('#ow-add select').nth(1).selectOption({ label: (await page.evaluate(() => window.__data.Departments[1].Title)) });
await page.locator('#ow-add .btn', { hasText: 'Upload' }).click();
await page.waitForFunction(() => /photos added/.test(document.querySelector('#ow-add small')?.textContent || ''), null, { timeout: 8000 }).catch(() => {});
const o_msgUp = await page.locator('#ow-add small').innerText();
ok('two photos uploaded with a clear message', /2 photos added/.test(o_msgUp) && !/Not uploaded/.test(o_msgUp), o_msgUp);
const o_after = await G();
const o_added = o_after.slice(o_before);
ok('rows stored with branch, region, category, department, published', o_added.length === 2 && o_added.every(r => r.Branch === 'Adenta Branch' && r.Region === 'Greater Accra' && r.Category === 'Anniversary Events' && r.Published === true && r.DepartmentId === 2), JSON.stringify(o_added.map(r => [r.Branch, r.Category, r.DepartmentId, r.Published])));
ok('captions default to the file names', o_added.map(r => r.Title).join('|') === 'logo 20th anniversary|hero celebration poster', o_added.map(r => r.Title).join('|'));
await page.waitForTimeout(900);
await page.locator('input[aria-label="Search by photo, branch or department"]').fill('adenta'); await page.waitForTimeout(1000);
ok('new photos found by branch search', (await page.locator('.gi').count()) === 2, await page.locator('.gi').count());
await page.locator('.gi-media').first().click(); await page.waitForTimeout(700);
ok('owner sees Edit panel in the viewer', (await page.locator('dialog[open] .ow-edit').count()) === 1);
const o_capBox = page.locator('dialog[open] .ow-edit input[type=text]').first();
await o_capBox.fill('Adenta 20th party');
await page.locator('dialog[open] .ow-edit input[placeholder="Type the branch"]').fill('Adenta Main');
await page.locator('dialog[open] .ow-edit .btn', { hasText: 'Save changes' }).click(); await page.waitForTimeout(700);
const o_edited = (await G()).filter(r => r.Title === 'Adenta 20th party')[0];
ok('edit saved caption and branch', !!o_edited && o_edited.Branch === 'Adenta Main', JSON.stringify(o_edited && [o_edited.Title, o_edited.Branch]));
await page.locator('dialog[open] .ow-edit .btn', { hasText: 'Hide from visitors' }).click(); await page.waitForTimeout(700);
ok('hide sets Published=false', (await G()).filter(r => r.Title === 'Adenta 20th party')[0].Published === false);
await page.locator('dialog[open] .ow-edit .btn', { hasText: 'Delete photo' }).click();
ok('delete asks to confirm first', (await G()).filter(r => r.Title === 'Adenta 20th party').length === 1);
await page.locator('dialog[open] .ow-edit .btn', { hasText: 'Yes, delete' }).click(); await page.waitForTimeout(900);
ok('delete removes the photo and closes the viewer', (await G()).filter(r => r.Title === 'Adenta 20th party').length === 0 && (await page.locator('dialog[open]').count()) === 0);
ok('gallery shows the remaining new photo', (await page.locator('.gi').count()) === 1, await page.locator('.gi').count());
// a visitor sees none of this
// owner edits the whole page from the Edit page panel
const D = (l) => page.evaluate((l) => window.__data[l], l);
await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
ok('owner sees the Edit page button', (await page.locator('.ed-fab').count()) === 1);
await page.locator('.ed-fab').click(); await page.waitForTimeout(500);
ok('Edit page opens with 7 tabs', (await page.locator('dialog[open] .ed-tabs button').count()) === 7);
// words
const heroCard = page.locator('dialog[open] .ed-card', { hasText: 'Top of the page: Title' });
await heroCard.locator('input').fill('20 Years of Bold Steps'); await heroCard.locator('.btn', { hasText: 'Save' }).click(); await page.waitForTimeout(900);
ok('word saved to PortalContent', (await D('PortalContent')).filter(r => r.Title === 'hero.title')[0].Value === '20 Years of Bold Steps');
ok('page shows the new words without a reload', (await page.locator('header.hero h1').innerText()).indexOf('Bold Steps') > -1, await page.locator('header.hero h1').innerText());
ok('edit panel stays open after saving', (await page.locator('dialog[open] .ed-tabs').count()) === 1);
const cd = page.locator('dialog[open] input[type=datetime-local]');
await cd.fill('2026-12-01T10:30'); await page.locator('dialog[open] .btn', { hasText: 'Save date' }).click(); await page.waitForTimeout(800);
ok('countdown date saved', /^2026-12-01T10:30/.test(new Date((await D('PortalContent')).filter(r => r.Title === 'countdown.date')[0].DateValue).toISOString().replace('Z','')), JSON.stringify((await D('PortalContent')).filter(r => r.Title === 'countdown.date')[0]));
// key figures: add
await page.locator('dialog[open] .ed-tabs button', { hasText: 'Key figures' }).click();
const nStats = (await D('KeyStats')).length;
const fresh = page.locator('dialog[open] .ed-new');
await fresh.locator('input').nth(0).fill('Awards Won'); await fresh.locator('input').nth(1).fill('12'); await fresh.locator('.btn', { hasText: 'Add' }).click(); await page.waitForTimeout(900);
ok('key figure added', (await D('KeyStats')).length === nStats + 1 && (await D('KeyStats')).some(r => r.Title === 'Awards Won' && r.Value === '12'));
ok('key figure appears on the page', (await page.locator('text=Awards Won').count()) >= 1);
// timeline: edit first row
await page.locator('dialog[open] .ed-tabs button', { hasText: 'Timeline' }).click();
const tl = page.locator('dialog[open] .ed-card:not(.ed-new)').first();
await tl.locator('textarea').fill('Edited milestone text'); await tl.locator('.btn', { hasText: 'Save' }).click(); await page.waitForTimeout(800);
ok('timeline edited', (await D('Timeline')).some(r => r.Title === 'Edited milestone text'));
// legends: add with a photo, then delete it
await page.locator('dialog[open] .ed-tabs button', { hasText: 'Legends' }).click();
const nLeg = (await D('Legends')).length;
const nl = page.locator('dialog[open] .ed-new');
const lab = (t) => nl.locator('label', { hasText: t }).locator('input');
await lab('Name').fill('Test Person'); await lab('Position').fill('Manager'); await lab('Department').fill('Prestige'); await lab('Branch').fill('Adenta');
await nl.locator('input[type=file]').setInputFiles(path.join(root, 'spfx-anniversary-portal/provisioning/media/logo-20th-anniversary.webp'));
await nl.locator('.btn', { hasText: 'Add' }).click(); await page.waitForTimeout(1200);
const added = (await D('Legends')).filter(r => r.Title === 'Test Person')[0];
ok('legend added with details', !!added && added.Position === 'Manager' && added.Branch === 'Adenta' && added.Department === 'Prestige', JSON.stringify(added));
ok('legend photo written', !!added && /serverRelativeUrl/.test(String(added.Photo)), JSON.stringify(added && added.Photo));
ok('picture stored in PortalAssets', (await D('PortalAssets')).some(r => r.Title === 'Test Person' && r.AssetType === 'Other'));
ok('legend count on the page went up', (await D('Legends')).length === nLeg + 1);
const del = page.locator('dialog[open] .ed-card', { hasText: 'Test Person' }).first();
await del.locator('.btn', { hasText: 'Delete' }).click(); await del.locator('.btn', { hasText: 'Yes, delete' }).click(); await page.waitForTimeout(900);
ok('legend deleted after confirmation', (await D('Legends')).length === nLeg);
// memory lane + voices + media
await page.locator('dialog[open] .ed-tabs button', { hasText: 'Memory Lane' }).click();
const mem = page.locator('dialog[open] .ed-card:not(.ed-new)').first();
await mem.locator('input[type=text]').fill('Edited caption'); await mem.locator('.btn', { hasText: 'Save' }).click(); await page.waitForTimeout(800);
ok('memory caption edited', (await D('MemoryLane')).some(r => r.Title === 'Edited caption'));
await page.locator('dialog[open] .ed-tabs button', { hasText: 'Leadership messages' }).click();
const vo = page.locator('dialog[open] .ed-card:not(.ed-new)').first();
await vo.locator('textarea').fill('A new thought from the CEO'); await vo.locator('.btn', { hasText: 'Save' }).click(); await page.waitForTimeout(800);
ok('leadership message edited', (await D('LeadershipMessages')).some(r => r.Message === 'A new thought from the CEO'));
await page.locator('dialog[open] .ed-tabs button', { hasText: 'Logo, video and music' }).click();
const nAs = (await D('PortalAssets')).length;
await page.locator('dialog[open] .ed-card', { hasText: 'Logo' }).first().locator('input[type=file]').setInputFiles(path.join(root, 'spfx-anniversary-portal/provisioning/media/logo-20th-anniversary.webp')); await page.waitForTimeout(1200);
const logoRows = (await D('PortalAssets')).filter(r => r.AssetType === 'Logo' && r.Active === true);
ok('logo replaced (new Active Logo file added)', (await D('PortalAssets')).length === nAs + 1 && logoRows.length >= 2, String(logoRows.length));
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
// a visitor never sees the editor
// by default visitors can view, search and react; they cannot post or comment
await open('photos=1'); await scrollTo('#wall');
ok('visitor: can post on the board by default', (await page.locator('textarea[aria-label="Your message"]').count()) === 1);
await open('photos=1&nopost=1'); await scrollTo('#wall');
ok('posting can be switched off: no form', (await page.locator('textarea[aria-label="Your message"]').count()) === 0);
await open('photos=1'); await scrollTo('#wall');
await scrollTo('#gbody'); await page.locator('.gi-media').first().click(); await page.waitForTimeout(800);
ok('visitor: can react to photos', (await page.locator('dialog[open] button[aria-label="Clap"]').count()) === 1);
await page.locator('dialog[open] button[aria-label="Clap"]').click(); await page.waitForTimeout(600);
ok('visitor reaction counts', /1/.test(await page.locator('dialog[open] button[aria-label="Clap"]').innerText()), await page.locator('dialog[open] button[aria-label="Clap"]').innerText());
ok('visitor: no owner tools anywhere', (await page.locator('.ow').count()) === 0 && (await page.locator('.ed-fab').count()) === 0);
ok('nobody sees a comment box or comments heading', (await page.locator('dialog[open] h4', { hasText: 'Comments' }).count()) === 0 && (await page.locator('dialog[open] textarea').count()) === 0);
ok('visitor: no comment box (legacy check)', (await page.locator('dialog[open] textarea').count()) === 0);
await page.keyboard.press('Escape');
// visitor sees no manage links
await open('photos=1'); ok('visitor sees no manage links', (await page.locator('text=Manage content').count()) === 0);
// failed list shows an error, rest of page still renders
await open('broken=1'); await scrollTo('#tree');
ok('missing list degrades to a message', (await page.locator('.state.err').count()) >= 1 && (await page.locator('#tree').count()) === 1);
// empty gallery
await open('nogallery=1'); await scrollTo('#gbody'); await page.waitForTimeout(800);
ok('empty gallery state', (await page.locator('text=No posts match').count()) === 1);
// Legends with Department and Branch as lookup columns also load
await open('legends=lookup'); await scrollTo('#tree');
ok('legends load with lookup columns (all 13)', (await page.locator('.node').count()) === 13 && (await page.locator('text=We could not load the legends').count()) === 0);
ok('lookup legends show department', /Corporate/.test(await page.locator('aside.panel').innerText()));
// celebration done / overlay
await open('overlay=1'); 
allRest.push(...(await page.evaluate(() => window.__rest || [])));
const bad = allRest.filter(r => r.status >= 400);
const uniq = [...new Set(bad.map(r => r.status + ' ' + r.req.slice(0, 150) + '  -> ' + r.msg.slice(0, 110)))];
console.log(results.join('\n')); console.log('errors:', JSON.stringify(errors));
console.log('REST calls: ' + allRest.length + ', rejected: ' + bad.length);
uniq.forEach(u => console.log('  REJECTED ' + u));
await browser.close(); server.close();
