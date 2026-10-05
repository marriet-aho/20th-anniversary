import * as React from 'react';
import * as ReactDom from 'react-dom';
import AnniversaryPortal from '../src/webparts/anniversaryPortal/components/AnniversaryPortal';
import { createFakeSp, Row } from '../src/webparts/anniversaryPortal/testing/fakeSp';
import { DEFAULT_SETTINGS } from '../src/webparts/anniversaryPortal/models';
import seed from '../provisioning/seed.json';

const params = new URLSearchParams(location.search);
const M = '/spfx-anniversary-portal/provisioning/media/';
const id = (rows: Row[]): Row[] => rows.map((r, i) => ({ Id: i + 1, ...r }));
const byTitle = (rows: Row[], t: string): Row | undefined => rows.filter(r => r.Title === t)[0];

const legends = id(seed.Legends.map(l => ({ ...l, Department: { Title: l.Department }, Branch: { Title: l.Branch } })));
if (params.get('photos')) legends.slice(0, 4).forEach(l => { l.Photo = JSON.stringify({ serverRelativeUrl: M + 'hero-celebration-poster.webp' }); });
const branches = id(seed.Branches), departments = id(seed.Departments);
const cats = seed.GalleryCategories;
const gallery: Row[] = params.get('nogallery') ? [] : Array.from({ length: 30 }, (_, i) => ({
  Id: i + 1, Title: 'Sample photo ' + (i + 1) + (i % 4 === 0 ? ' with a rather long caption that wraps over lines' : ''),
  Category: cats[i % cats.length], Featured: i % 7 === 0, Published: i !== 5, Credit: 'Ama O.', BranchId: 1 + (i % 3), DepartmentId: 1 + (i % 4),
  Branch: { Title: branches[i % 3].Title }, Department: { Title: departments[i % 4].Title },
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
  PortalContent: content, Timeline: id(seed.Timeline), KeyStats: id(seed.KeyStats), Legends: legends, MemoryLane: id(seed.MemoryLane),
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
ReactDom.render(<AnniversaryPortal context={context} sp={sp} settings={DEFAULT_SETTINGS} isDarkTheme={params.get('theme') === 'dark'} />, document.getElementById('app'));
