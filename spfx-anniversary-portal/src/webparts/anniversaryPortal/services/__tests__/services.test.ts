import { createFakeSp, Row } from '../../testing/fakeSp';
import { DEFAULT_SETTINGS } from '../../models';
import { PortalService } from '../PortalService';
import { BoardService, STATS_THRESHOLD } from '../BoardService';
import { buildGalleryFilter, GalleryService } from '../GalleryService';
import { ReactionService } from '../ReactionService';

const cfg = DEFAULT_SETTINGS;
const me = { id: 7, displayName: 'Me' };

function base(): { [list: string]: Row[] } {
  return {
    PortalContent: [{ Id: 1, Title: 'hero.title', Value: 'Hi' }, { Id: 2, Title: 'countdown.date', Value: '', DateValue: '2026-10-01T13:15:00Z' }],
    Timeline: [{ Id: 2, Title: 'b', Year: 2010, SortOrder: 2 }, { Id: 1, Title: 'a', Year: 2006, SortOrder: 1 }],
    KeyStats: [], MemoryLane: [], LeadershipMessages: [], BoardStats: [],
    Legends: [
      { Id: 1, Title: 'B', SortOrder: 2, Active: true, Department: { Title: 'D' }, Branch: { Title: 'HO' }, Photo: '{"serverRelativeUrl":"/p.jpg"}' },
      { Id: 2, Title: 'A', SortOrder: 1, Active: true },
      { Id: 3, Title: 'Gone', SortOrder: 3, Active: false }
    ],
    Branches: [{ Id: 1, Title: 'Head Office', Active: true }, { Id: 2, Title: 'Old', Active: false }],
    Departments: [],
    PortalAssets: [
      { Id: 1, Title: 'old loop', AssetType: 'HeroVideo', Active: true, FileRef: '/a/old.mp4' },
      { Id: 2, Title: 'new loop', AssetType: 'HeroVideo', Active: true, FileRef: '/a/new.mp4' },
      { Id: 3, Title: 'Watermark', AssetType: 'Other', Active: true, FileRef: '/a/wm.webp' },
      { Id: 4, Title: 'off', AssetType: 'Logo', Active: false, FileRef: '/a/logo.webp' }
    ],
    BoardMessages: [], GalleryMedia: [], GalleryReactions: [], GalleryComments: []
  };
}

describe('PortalService', () => {
  it('reads content as a key/value map and orders timeline by SortOrder', async () => {
    const { sp } = createFakeSp(base());
    const s = new PortalService(sp, cfg, me);
    const c = await s.getContent();
    expect(c['hero.title'].value).toBe('Hi');
    expect(c['countdown.date'].date).toBe('2026-10-01T13:15:00Z');
    expect((await s.getTimeline()).map(t => t.title)).toEqual(['a', 'b']);
  });
  it('returns only Active legends, in tree order, and parses the photo', async () => {
    const { sp } = createFakeSp(base());
    const l = await new PortalService(sp, cfg, me).getLegends();
    expect(l.map(x => x.name)).toEqual(['A', 'B']);
    expect(l[1].photo).toBe('/p.jpg');
  });
  it('picks the newest Active asset per type and maps the Watermark', async () => {
    const { sp } = createFakeSp(base());
    const a = await new PortalService(sp, cfg, me).getAssets();
    expect(a.HeroVideo).toBe('/a/new.mp4');
    expect(a.Watermark).toBe('/a/wm.webp');
    expect(a.Logo).toBeUndefined();
  });
  it('caches reads and does not cache failures', async () => {
    const f = createFakeSp(base());
    const s = new PortalService(f.sp, cfg, me);
    await s.getLegends(); await s.getLegends();
    expect(f.calls.filter(c => c.list === 'Legends').length).toBe(1);
    const broken = new PortalService(createFakeSp({}).sp, cfg, me);
    await expect(broken.getLegends()).rejects.toThrow();
    await expect(broken.getLegends()).rejects.toThrow();
  });
  it('detects owners by permission or by group membership', async () => {
    expect((await new PortalService(createFakeSp(base(), { isOwner: true }).sp, cfg, me).getUser()).isOwner).toBe(true);
    expect((await new PortalService(createFakeSp(base(), { ownerGroupMember: true }).sp, cfg, me).getUser()).isOwner).toBe(true);
    expect((await new PortalService(createFakeSp(base()).sp, cfg, me).getUser()).isOwner).toBe(false);
  });
});

describe('BoardService', () => {
  const msgs = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({
    Id: i + 1, Title: 't', Message: 'm' + i, Tags: ['Teamwork'], Published: i % 5 !== 0, Featured: i < 2,
    CelebratingId: i % 3 === 0 ? 1 : i % 3 === 1 ? 2 : undefined, Created: new Date(2026, 0, 1 + i).toISOString(),
    Author: { Id: 7, Title: 'Me' }
  }));
  it('shows non-owners only Published messages, newest first, in pages', async () => {
    const d = base(); d.BoardMessages = msgs(30);
    const f = createFakeSp(d, { pageSize: 10 });
    const p = await new BoardService(f.sp, cfg).getPage(false, 10);
    expect(p.items.length).toBe(10);
    expect(p.items.every(m => m.published)).toBe(true);
    expect(p.hasMore).toBe(true);
    expect(f.calls[0].filter).toBe('Published eq 1');
    expect(new Date(p.items[0].created).getTime()).toBeGreaterThan(new Date(p.items[1].created).getTime());
    const n = await p.next();
    expect(n.items.length).toBe(10);
  });
  it('lets owners see hidden messages', async () => {
    const d = base(); d.BoardMessages = msgs(10);
    const p = await new BoardService(createFakeSp(d).sp, cfg).getPage(true, 50);
    expect(p.items.some(m => !m.published)).toBe(true);
  });
  it('creates a message with a 80-char title, 400-char cap and the chosen tags', async () => {
    const f = createFakeSp(base());
    await new BoardService(f.sp, cfg).add('x'.repeat(500), 3, ['Teamwork']);
    const body = f.calls.filter(c => c.op === 'add')[0].body as Row;
    expect((body.Message as string).length).toBe(400);
    expect((body.Title as string).length).toBeLessThanOrEqual(80);
    expect(body.CelebratingId).toBe(3);
    expect(body.Published).toBe(true);
  });
  it('tallies the top celebrated legends from Published messages', async () => {
    const d = base(); d.BoardMessages = msgs(30);
    const s = await new BoardService(createFakeSp(d).sp, cfg).getStats();
    expect(s.total).toBe(24);
    expect(s.top.length).toBe(2);
    expect(s.fromSummary).toBe(false);
  });
  it('reads the BoardStats summary for large boards', async () => {
    const d = base();
    d.BoardMessages = msgs(5);
    d.BoardStats = [{ Id: 1, Title: 'MessagesShared', Value: String(STATS_THRESHOLD + 500) }, { Id: 2, Title: 'TopLegends', Value: '[{"id":4,"count":99}]' }];
    const s = await new BoardService(createFakeSp(d).sp, cfg).getStats();
    expect(s).toEqual({ total: STATS_THRESHOLD + 500, top: [{ id: 4, count: 99 }], fromSummary: true });
  });
  it('toggles Featured/Published and deletes', async () => {
    const d = base(); d.BoardMessages = msgs(3);
    const svc = new BoardService(createFakeSp(d).sp, cfg);
    await svc.setFlag(2, 'Featured', true);
    expect(d.BoardMessages.filter(r => r.Id === 2)[0].Featured).toBe(true);
    await svc.remove(2);
    expect(d.BoardMessages.length).toBe(2);
  });
});

describe('GalleryService', () => {
  it('builds filters with the indexed column first and escapes quotes', () => {
    expect(buildGalleryFilter({ category: 'All', search: '' }, false)).toBe('Published eq 1');
    expect(buildGalleryFilter({ category: 'All', search: '' }, true)).toBe('');
    expect(buildGalleryFilter({ category: 'Featured', search: "o'neil", branchId: 3, departmentId: 4 }, false))
      .toBe("Published eq 1 and Featured eq 1 and BranchId eq 3 and DepartmentId eq 4 and substringof('o''neil',Title)");
    expect(buildGalleryFilter({ category: 'Team Moments', search: '' }, false)).toBe("Published eq 1 and Category eq 'Team Moments'");
  });
  it('lists published media, featured first, and flags videos', async () => {
    const d = base();
    d.GalleryMedia = [
      { Id: 1, Title: 'one', Published: true, Featured: false, Category: 'Team Moments', Created: '2026-01-02', File: { Name: 'a.jpg', ServerRelativeUrl: '/sites/x/G/a.jpg' } },
      { Id: 2, Title: 'two', Published: true, Featured: true, Category: 'Fun Memories', Created: '2026-01-01', File: { Name: 'b.mp4', ServerRelativeUrl: '/sites/x/G/b.mp4' } },
      { Id: 3, Title: 'hid', Published: false, Featured: false, Created: '2026-01-03', File: { Name: 'c.jpg', ServerRelativeUrl: '/c.jpg' } }
    ];
    const svc = new GalleryService(createFakeSp(d).sp, cfg);
    const p = await svc.getPage({ category: 'All', search: '' }, false, 12);
    expect(p.items.map(i => i.id)).toEqual([2, 1]);
    expect(p.items[0].isVideo).toBe(true);
    expect((await svc.getPage({ category: 'All', search: 'ONE' }, false, 12)).items.map(i => i.id)).toEqual([1]);
    expect(await svc.count(false)).toBe(2);
    expect(await svc.count(true)).toBe(3);
  });
  it('builds a same-origin thumbnail URL', () => {
    const svc = new GalleryService(createFakeSp(base()).sp, cfg);
    const u = svc.thumbnail({ url: '/sites/x/G/a.jpg' } as never, 'https://t.sharepoint.com/sites/x');
    expect(u).toBe('https://t.sharepoint.com/sites/x/_layouts/15/getpreview.ashx?resolution=1&clientMode=modernWebPart&path='
      + encodeURIComponent('https://t.sharepoint.com/sites/x/G/a.jpg'));
  });
  it('lists comments of an item and hides unpublished ones from non-owners', async () => {
    const d = base();
    d.GalleryComments = [
      { Id: 1, GalleryItemId: 5, Comment: 'a', Published: true, Created: '2026-01-01', Author: { Title: 'X' } },
      { Id: 2, GalleryItemId: 5, Comment: 'b', Published: false, Created: '2026-01-02', Author: { Title: 'Y' } },
      { Id: 3, GalleryItemId: 6, Comment: 'c', Published: true, Created: '2026-01-02', Author: { Title: 'Z' } }
    ];
    const svc = new GalleryService(createFakeSp(d).sp, cfg);
    expect((await svc.getComments(5, false)).map(c => c.id)).toEqual([1]);
    expect((await svc.getComments(5, true)).map(c => c.id)).toEqual([1, 2]);
  });
});

describe('ReactionService (one reaction per user, enforced by ReactionKey)', () => {
  it('adds, then removes on a second click', async () => {
    const f = createFakeSp(base());
    const svc = new ReactionService(f.sp, cfg, 7);
    const empty = await svc.forItem(5);
    const added = await svc.toggle(5, 'Clap', empty);
    expect(added.counts.Clap).toBe(1);
    expect(added.mine.Clap).toBeDefined();
    expect((f.data.GalleryReactions[0] as Row).ReactionKey).toBe('5-7-Clap');
    const removed = await svc.toggle(5, 'Clap', added);
    expect(removed.counts.Clap).toBe(0);
    expect(f.data.GalleryReactions.length).toBe(0);
  });
  it('re-reads the truth when the unique key rejects a duplicate', async () => {
    const f = createFakeSp(base());
    f.data.GalleryReactions.push({ Id: 9, GalleryItemId: 5, Reaction: 'Like', ReactionKey: '5-7-Like', AuthorId: 7 });
    const svc = new ReactionService(f.sp, cfg, 7);
    const stale = await svc.summarise([]); // the screen thinks nothing is selected
    const r = await svc.toggle(5, 'Like', stale);
    expect(r.counts.Like).toBe(1);
    expect(r.mine.Like).toBe(9);
    expect(f.data.GalleryReactions.length).toBe(1);
  });
  it('counts likes per card in one query and separates users', async () => {
    const f = createFakeSp(base());
    f.data.GalleryReactions.push(
      { Id: 1, GalleryItemId: 5, Reaction: 'Like', AuthorId: 7 }, { Id: 2, GalleryItemId: 5, Reaction: 'Like', AuthorId: 8 },
      { Id: 3, GalleryItemId: 6, Reaction: 'Clap', AuthorId: 8 });
    const svc = new ReactionService(f.sp, cfg, 7);
    expect(await svc.likeCounts([5, 6, 7])).toEqual({ 5: 2 });
    const s = await svc.forItem(5);
    expect(s.counts.Like).toBe(2);
    expect(s.mine.Like).toBe(1);
  });
});
