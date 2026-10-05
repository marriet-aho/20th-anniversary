import { SPFI } from './sp';
import { IGalleryComment, IGalleryItem, IPage, IPortalSettings } from '../models';
import { mapGalleryItem } from './mappers';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const GALLERY_CATEGORIES = [
  'Then & Now', 'Branch Celebrations', 'Team Moments', 'Community Impact', 'Anniversary Events', 'Fun Memories'
];

export interface IGalleryQuery {
  category: string; // 'All' | 'Featured' | a category
  branch: string;      // typed by the visitor; matches part of the Branch text
  region: string;      // typed by the visitor; matches part of the Region text
  departmentId?: number;
  search: string;
}

const SELECT = ['Id', 'Title', 'Category', 'Featured', 'Published', 'Credit', 'DateTaken', 'Branch', 'Region',
  'Department/Title', 'File/Name', 'File/ServerRelativeUrl'];

const esc = (v: string): string => v.replace(/'/g, "''");

export function buildGalleryFilter(q: IGalleryQuery, isOwner: boolean): string {
  const f: string[] = [];
  if (!isOwner) f.push('Published eq 1'); // indexed column first
  if (q.category === 'Featured') f.push('Featured eq 1');
  else if (q.category && q.category !== 'All') f.push("Category eq '" + esc(q.category) + "'");
  if (q.branch.trim()) f.push("substringof('" + esc(q.branch.trim()) + "',Branch)");
  if (q.region.trim()) f.push("substringof('" + esc(q.region.trim()) + "',Region)");
  if (q.departmentId) f.push('DepartmentId eq ' + q.departmentId);
  if (q.search.trim()) f.push("substringof('" + esc(q.search.trim()) + "',Title)");
  return f.join(' and ');
}

export class GalleryService {
  constructor(private readonly sp: SPFI, private readonly cfg: IPortalSettings) { }

  private lib(): any { return this.sp.web.lists.getByTitle(this.cfg.galleryLibrary); }

  private async wrap(paged: any): Promise<IPage<IGalleryItem>> {
    return {
      items: (paged.results as any[]).map(mapGalleryItem),
      hasMore: !!paged.hasNext,
      next: async () => this.wrap(await paged.getNext())
    };
  }

  public async getPage(q: IGalleryQuery, isOwner: boolean, size: number): Promise<IPage<IGalleryItem>> {
    let items = this.lib().items.select(...SELECT).expand('Department', 'File');
    const filter = buildGalleryFilter(q, isOwner);
    if (filter) items = items.filter(filter);
    return this.wrap(await items.orderBy('Featured', false).orderBy('Created', false).top(size).getPaged());
  }

  /** Total published items, for the "Show gallery (N)" label. */
  public async count(isOwner: boolean): Promise<number> {
    let total = 0;
    let items = this.lib().items.select('Id');
    if (!isOwner) items = items.filter('Published eq 1');
    let page: any = await items.top(2000).getPaged();
    for (;;) {
      total += (page.results as any[]).length;
      if (!page.hasNext) break;
      page = await page.getNext();
    }
    return total;
  }

  public async getComments(itemId: number, isOwner: boolean): Promise<IGalleryComment[]> {
    let f = 'GalleryItemId eq ' + itemId;
    if (!isOwner) f += ' and Published eq 1';
    const rows: any[] = await this.sp.web.lists.getByTitle(this.cfg.commentsList).items
      .select('Id', 'Comment', 'Created', 'Author/Title').expand('Author').filter(f).orderBy('Created', true).top(100)();
    return rows.map(r => ({
      id: r.Id as number, text: String(r.Comment || ''), created: String(r.Created || ''),
      authorName: String((r.Author && r.Author.Title) || '')
    }));
  }

  public async addComment(itemId: number, text: string, authorName: string): Promise<void> {
    const t = text.trim().slice(0, 1000);
    await this.sp.web.lists.getByTitle(this.cfg.commentsList).items.add({
      Title: (authorName + ': ' + t).slice(0, 80), GalleryItemId: itemId, Comment: t, Published: true
    });
  }

  /** A server-generated thumbnail; the full file is only requested in the lightbox. */
  public thumbnail(item: IGalleryItem, webUrl: string): string {
    const m = webUrl.match(/^(https?:\/\/[^/]+)/);
    const origin = m ? m[1] : '';
    return webUrl.replace(/\/$/, '') + '/_layouts/15/getpreview.ashx?resolution=1&clientMode=modernWebPart&path='
      + encodeURIComponent(origin + item.url);
  }
}
