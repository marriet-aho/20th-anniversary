import { SPFI } from './sp';
import { IGalleryComment, IGalleryItem, IPage, IPortalSettings } from '../models';
import { mapGalleryItem } from './mappers';
import { eachPage, pageOf } from './paging';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const GALLERY_CATEGORIES = ['Branch Celebrations', 'Anniversary Events'];

export interface IPhotoDetails { title: string; category: string; branch: string; region: string; departmentId?: number }

const CHUNK_AT = 8 * 1024 * 1024;
const fileSafe = (n: string): string => n.replace(/[~"#%&*:<>?/\\{|}]+/g, '-').replace(/\s+/g, ' ').trim().slice(-90);
const fieldsOf = (d: IPhotoDetails): { [k: string]: unknown } => ({
  Title: d.title.trim().slice(0, 250), Category: d.category, Branch: d.branch.trim(), Region: d.region.trim(),
  DepartmentId: d.departmentId || null
});

export interface IGalleryQuery {
  category: string; // 'All' or a category
  search: string;      // one box: matches the caption, Branch or Region text, or a department
  departmentIds?: number[]; // departments whose name contains the search text (resolved by the page)
}

const SELECT = ['Id', 'Title', 'Category', 'Published', 'DepartmentId', 'Credit', 'DateTaken', 'Branch', 'Region',
  'Department/Title', 'File/Name', 'File/ServerRelativeUrl'];

const esc = (v: string): string => v.replace(/'/g, "''");

export function buildGalleryFilter(q: IGalleryQuery, isOwner: boolean): string {
  const f: string[] = [];
  if (!isOwner) f.push('Published eq 1'); // indexed column first
  if (q.category && q.category !== 'All') f.push("Category eq '" + esc(q.category) + "'");
  const s = q.search.trim();
  if (s) {
    const any = ['Title', 'Branch', 'Region'].map(c => "substringof('" + esc(s) + "'," + c + ')')
      .concat((q.departmentIds || []).map(id => 'DepartmentId eq ' + id));
    f.push('(' + any.join(' or ') + ')');
  }
  return f.join(' and ');
}

export class GalleryService {
  constructor(private readonly sp: SPFI, private readonly cfg: IPortalSettings) { }

  private lib(): any { return this.sp.web.lists.getByTitle(this.cfg.galleryLibrary); }

  public async getPage(q: IGalleryQuery, isOwner: boolean, size: number): Promise<IPage<IGalleryItem>> {
    let items = this.lib().items.select(...SELECT).expand('Department', 'File');
    const filter = buildGalleryFilter(q, isOwner);
    if (filter) items = items.filter(filter);
    return pageOf(items.orderBy('Created', false), size, mapGalleryItem);
  }

  /** Owner only: upload a photo or video, then fill in its details. Returns the new item's id. */
  public async upload(file: File, d: IPhotoDetails): Promise<number> {
    const name = Date.now().toString(36) + '-' + fileSafe(file.name);
    const folder = this.lib().rootFolder;
    const info: any = file.size > CHUNK_AT
      ? await folder.files.addChunked(name, file, { Overwrite: false })
      : await folder.files.addUsingPath(name, file, { Overwrite: false });
    const row: any = await this.sp.web.getFileByServerRelativePath(info.ServerRelativeUrl).listItemAllFields.select('Id')();
    await this.lib().items.getById(row.Id).update({ ...fieldsOf(d), Published: true });
    return row.Id as number;
  }

  /** Owner only: change a photo's caption, category, branch, region or department. */
  public async updateDetails(id: number, d: IPhotoDetails): Promise<void> {
    await this.lib().items.getById(id).update(fieldsOf(d));
  }

  public async setPublished(id: number, published: boolean): Promise<void> {
    await this.lib().items.getById(id).update({ Published: published });
  }

  /** Owner only: moves the photo to the site Recycle Bin, so it can be restored. */
  public async remove(id: number): Promise<void> {
    await this.lib().items.getById(id).recycle();
  }

  /** Total published items, for the "Show gallery (N)" label. */
  public async count(isOwner: boolean): Promise<number> {
    let total = 0;
    let items = this.lib().items.select('Id');
    if (!isOwner) items = items.filter('Published eq 1');
    await eachPage(items, 2000, rows => { total += rows.length; });
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
