import { SPFI } from './sp';
import { AssetType, IPortalSettings } from '../models';

/* eslint-disable @typescript-eslint/no-explicit-any */
const CHUNK_AT = 8 * 1024 * 1024;
const fileSafe = (n: string): string => n.replace(/[~"#%&*:<>?/\\{|}]+/g, '-').replace(/\s+/g, ' ').trim().slice(-90);
const esc = (v: string): string => v.replace(/'/g, "''");

/** What the "Edit page" panel can replace, with the file kinds each one accepts. */
export const MEDIA_SLOTS: { type: AssetType; label: string; accept: string }[] = [
  { type: 'Logo', label: 'Logo', accept: 'image/*' },
  { type: 'HeroVideo', label: 'Top-of-page video (loop)', accept: 'video/*' },
  { type: 'HeroPoster', label: 'Top-of-page picture (shown before the video)', accept: 'image/*' },
  { type: 'BackgroundMusic', label: 'Background music', accept: 'audio/*' },
  { type: 'AnniversaryVideo', label: 'Anniversary video', accept: 'video/*' },
  { type: 'VideoPoster', label: 'Anniversary video cover picture', accept: 'image/*' },
  { type: 'Watermark', label: 'Board watermark', accept: 'image/*' }
];

export interface ILegendWrite { name: string; quote: string; position: string; department: string; branch: string; sortOrder: number }

/** Owner-only writes behind the "Edit page" panel. Nothing here is used by visitors. */
export class EditService {
  constructor(private readonly sp: SPFI, private readonly cfg: IPortalSettings) { }

  private list(name: string): any { return this.sp.web.lists.getByTitle(name); }

  /** Upload into a document library; returns the item id and the server-relative URL. */
  private async upload(library: string, file: File): Promise<{ id: number; url: string; name: string }> {
    const name = Date.now().toString(36) + '-' + fileSafe(file.name);
    const folder = this.list(library).rootFolder;
    const info: any = file.size > CHUNK_AT
      ? await folder.files.addChunked(name, file, { Overwrite: false })
      : await folder.files.addUsingPath(name, file, { Overwrite: false });
    const row: any = await this.sp.web.getFileByServerRelativePath(info.ServerRelativeUrl).listItemAllFields.select('Id')();
    return { id: row.Id as number, url: String(info.ServerRelativeUrl), name };
  }

  /** Save one editable text (or the countdown date) in PortalContent. */
  public async saveText(key: string, value: string, date?: string): Promise<void> {
    const rows: any[] = await this.list(this.cfg.contentList).items.select('Id').filter("Title eq '" + esc(key) + "'").top(1)();
    const body: { [k: string]: unknown } = date !== undefined ? { DateValue: date } : { Value: value };
    if (rows.length) await this.list(this.cfg.contentList).items.getById(rows[0].Id).update(body);
    else await this.list(this.cfg.contentList).items.add({ Title: key, ...body });
  }

  public async addRow(listName: string, fields: { [k: string]: unknown }): Promise<number> {
    const r: any = await this.list(listName).items.add(fields);
    return Number((r && r.Id) || (r && r.data && r.data.Id) || 0);
  }

  public async updateRow(listName: string, id: number, fields: { [k: string]: unknown }): Promise<void> {
    await this.list(listName).items.getById(id).update(fields);
  }

  /** Moves the row to the site Recycle Bin, so it can be restored. */
  public async removeRow(listName: string, id: number): Promise<void> {
    await this.list(listName).items.getById(id).recycle();
  }

  /** Upload a picture and write it into an Image (or text) Photo column of a list item. */
  public async setPhoto(listName: string, id: number, file: File, title: string): Promise<void> {
    const up = await this.upload(this.cfg.assetsLibrary, file);
    await this.list(this.cfg.assetsLibrary).items.getById(up.id).update({ Title: title.slice(0, 200), AssetType: 'Other', Active: true });
    try {
      await this.updateRow(listName, id, { Photo: JSON.stringify({ type: 'thumbnail', fileName: up.name, serverRelativeUrl: up.url }) });
    } catch {
      await this.updateRow(listName, id, { Photo: up.url }); // the column is plain text
    }
  }

  /** Legends: Department and Branch may each be a text or a lookup column (shape comes from how the legends loaded). */
  public async saveLegend(id: number, w: ILegendWrite, shape: { dept: boolean; branch: boolean },
    lookups: { departments: { id: number; title: string }[]; branches: { id: number; title: string }[] }): Promise<number> {
    const idOf = (xs: { id: number; title: string }[], t: string): number | undefined => {
      const hit = xs.filter(x => x.title.trim().toLowerCase() === t.trim().toLowerCase())[0];
      return hit ? hit.id : undefined;
    };
    const fields: { [k: string]: unknown } = { Title: w.name, Position: w.position, SortOrder: w.sortOrder, Quote: w.quote };
    if (shape.dept) { const d = idOf(lookups.departments, w.department); if (d) fields.DepartmentId = d; } else fields.Department = w.department;
    if (shape.branch) { const b = idOf(lookups.branches, w.branch); if (b) fields.BranchId = b; } else fields.Branch = w.branch;
    if (id) { await this.updateRow(this.cfg.legendsList, id, fields); return id; }
    return this.addRow(this.cfg.legendsList, { ...fields, Active: true });
  }

  /** Replace one of the page's own media files. The newest Active file of each type is the one shown. */
  public async replaceMedia(type: AssetType, label: string, file: File): Promise<void> {
    const up = await this.upload(this.cfg.assetsLibrary, file);
    await this.list(this.cfg.assetsLibrary).items.getById(up.id).update({
      Title: type === 'Watermark' ? 'Watermark' : label, AssetType: type === 'Watermark' ? 'Other' : type, Active: true
    });
  }
}
