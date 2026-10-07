import * as React from 'react';
import * as ReactDom from 'react-dom';
import AnniversaryPortal from '../src/webparts/anniversaryPortal/components/AnniversaryPortal';
import { createFakeSp, Row } from '../src/webparts/anniversaryPortal/testing/fakeSp';
import { DEFAULT_SETTINGS } from '../src/webparts/anniversaryPortal/models';
import seed from '../provisioning/seed.json';

import { GalleryService } from '../src/webparts/anniversaryPortal/services/GalleryService';

// In the harness there is no getpreview.ashx, so thumbnails use the file itself.
GalleryService.prototype.thumbnail = function (item: { url: string }): string { return item.url; };

const state: { [k: string]: string } = {};
new URLSearchParams(location.search).forEach((v, k) => { state[k] = v; });
if (!('photos' in state)) state.photos = '1';
const params = { get: (k: string): string | undefined => state[k] };
const M = 'media/';

function mount(): void {
const id = (rows: Row[]): Row[] => rows.map((r, i) => ({ Id: i + 1, ...r }));
const byTitle = (rows: Row[], t: string): Row | undefined => rows.filter(r => r.Title === t)[0];

  const legends = id(seed.Legends.map(l => ({ ...l, Department: l.Department, Branch: l.Branch,
    Photo: (l as { PhotoFile?: string }).PhotoFile ? JSON.stringify({ serverRelativeUrl: M + (l as { PhotoFile?: string }).PhotoFile }) : '' })));
  const branches = id(seed.Branches), departments = id(seed.Departments);
  const cats = seed.GalleryCategories;
  const gallery: Row[] = params.get('nogallery') ? [] : Array.from({ length: 30 }, (_, i) => ({
    Id: i + 1, Title: 'Sample photo ' + (i + 1) + (i % 4 === 0 ? ' with a rather long caption that wraps over lines' : ''),
    Category: cats[i % cats.length], Featured: i % 7 === 0, Published: i !== 5, Credit: 'Ama O.', Branch: ['Head Office', 'Kumasi Main', 'Tamale Branch'][i % 3], Region: ['Greater Accra', 'Ashanti', 'Northern'][i % 3], DepartmentId: 1 + (i % 4), Department: { Title: departments[i % 4].Title },
    Created: new Date(2026, 0, i + 1).toISOString(), File: { Name: i === 3 ? 'clip.mp4' : 'p' + i + '.webp', ServerRelativeUrl: M + (i === 3 ? 'hero-celebration-loop.mp4' : 'logo-20th-anniversary.webp') }
  }));
  const board: Row[] = seed.BoardMessages.map((m, i) => ({
    Id: i + 1, Title: m.Title, Message: m.Message, Tags: m.Tags, Featured: m.Featured, Published: true, CelebratingId: legends.filter(l => l.Title === m.Celebrating)[0].Id,
    Celebrating: { Title: m.Celebrating }, Author: { Id: 3, Title: ['Efua Mensah', 'Kofi Ansah', 'Yaa Boateng'][i] }, Created: new Date(2026, 0, 10 + i).toISOString()
  }));
  if (!params.get('fewboard')) for (let i = 4; i <= 30; i++) board.push({ Id: i, Title: 'x', Message: 'Sample text: thank you to our team for twenty years of service number ' + i, Tags: ['Teamwork', 'Appreciation'],
    Featured: false, Published: i % 9 !== 0, CelebratingId: (i % 4) + 1, Celebrating: { Title: legends[i % 4].Title }, Author: { Id: i === 7 ? 7 : 3, Title: i === 7 ? 'Ama Mensah' : 'A colleague' }, Created: new Date(2026, 1, i).toISOString() });
  const content = id(seed.PortalContent.map(c => ({ ...c })));
  if (params.get('countdown') === 'done') { const c = byTitle(content, 'countdown.date'); if (c) c.DateValue = '2020-01-01T00:00:00Z'; }
  const assets: Row[] = id([
    { Title: 'Hero loop', AssetType: 'HeroVideo', Active: true, FileRef: M + 'hero-celebration-loop.mp4' },
    { Title: 'Hero poster', AssetType: 'HeroPoster', Active: true, FileRef: M + 'hero-celebration-poster.webp' },
    { Title: 'Logo', AssetType: 'Logo', Active: true, FileRef: M + 'logo-20th-anniversary.webp' },
    { Title: 'Watermark', AssetType: 'Other', Active: true, FileRef: M + 'board-watermark.webp' },
    { Title: 'Music', AssetType: 'BackgroundMusic', Active: true, FileRef: M + 'background-music.mp3' },
    { Title: 'Film', AssetType: 'AnniversaryVideo', Active: true, FileRef: M + 'anniversary-video-web.mp4' },
    { Title: 'Film poster', AssetType: 'VideoPoster', Active: true, FileRef: M + 'anniversary-video-poster.webp' }
  ]);
  const data = {
    PortalContent: content, Timeline: id(seed.Timeline), KeyStats: id(seed.KeyStats), Legends: legends, MemoryLane: id(seed.MemoryLane.map(m => ({ ...m, Photo: (m as { PhotoFile?: string }).PhotoFile ? JSON.stringify({ serverRelativeUrl: M + (m as { PhotoFile?: string }).PhotoFile }) : '' }))),
    LeadershipMessages: id(seed.LeadershipMessages), BoardMessages: board, BoardStats: [], GalleryMedia: gallery, GalleryReactions: [
      { Id: 1, GalleryItemId: 1, Reaction: 'Like', AuthorId: 3 }, { Id: 2, GalleryItemId: 1, Reaction: 'Like', AuthorId: 4 }],
    GalleryComments: [{ Id: 1, GalleryItemId: 1, Comment: 'Where did the time go?', Published: true, Created: '2026-01-02', Author: { Title: 'Efua' } }],
    Branches: branches, Departments: departments, PortalAssets: assets
  } as { [k: string]: Row[] };
  if (params.get('broken')) delete (data as Row).Timeline;

  const { sp } = createFakeSp(data, { userId: 7, isOwner: !!params.get('owner'), pageSize: 12 });
  const context = {
    pageContext: { web: { absoluteUrl: location.origin + '/spfx-anniversary-portal/qa', serverRelativeUrl: '/spfx-anniversary-portal/qa' },
      user: { displayName: 'Ama Mensah' }, legacyPageContext: { userId: 7 } }
  } as never;
  (window as unknown as { __data: unknown }).__data = data;
  ReactDom.unmountComponentAtNode(document.getElementById('app') as HTMLElement);
  ReactDom.render(<AnniversaryPortal context={context} sp={sp} settings={DEFAULT_SETTINGS} isDarkTheme={params.get('theme') === 'dark'} />, document.getElementById('app'));
}

// ---- preview toolbar (not part of the portal) ----
const TOGGLES: { key: string; label: string; on: string; off?: string }[] = [
  { key: 'owner', label: 'Owner view', on: '1' }, { key: 'theme', label: 'Dark theme', on: 'dark' },
  { key: 'countdown', label: 'Countdown finished', on: 'done' }, { key: 'broken', label: 'Broken list', on: '1' },
  { key: 'nogallery', label: 'Empty gallery', on: '1' }, { key: 'fewboard', label: 'Short board', on: '1' }
];
function toolbar(): void {
  const bar = document.createElement('div');
  bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Preview options');
  bar.style.cssText = 'position:fixed;left:50%;bottom:calc(10px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147483000;'
    + 'background:#111827;color:#fff;border-radius:12px;padding:6px 8px;display:flex;gap:6px;flex-wrap:wrap;justify-content:center;max-width:96vw;'
    + 'font:600 12px system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.4)';
  const lab = document.createElement('span'); lab.textContent = 'Preview'; lab.style.cssText = 'align-self:center;padding:0 6px;opacity:.7';
  bar.appendChild(lab);
  TOGGLES.forEach(t => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = t.label;
    const paint = (): void => { const on = state[t.key] === t.on; b.setAttribute('aria-pressed', String(on)); b.style.cssText = 'border:1px solid #4b5563;border-radius:8px;padding:5px 9px;cursor:pointer;font:inherit;'
      + (on ? 'background:#F58220;color:#111;border-color:#F58220' : 'background:transparent;color:#fff'); };
    paint();
    b.onclick = () => { if (state[t.key] === t.on) delete state[t.key]; else state[t.key] = t.on; bar.querySelectorAll('button').forEach(x => x.dispatchEvent(new Event('repaint'))); mount(); };
    b.addEventListener('repaint', paint);
    bar.appendChild(b);
  });
  document.body.appendChild(bar);
}
if (!('notoolbar' in state)) toolbar();
mount();
