import { SPFI } from './sp';
import { IBoardMessage, IPage, IPortalSettings, TagKey } from '../models';
import { mapBoardMessage } from './mappers';
import { truncate } from '../logic/names';
import { ITopLegend, tallyTopLegends } from '../logic/topLegends';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const MAX_MESSAGE = 400;
export const STATS_THRESHOLD = 2000;
const SELECT = ['Id', 'Title', 'Message', 'Tags', 'Featured', 'Published', 'Created', 'CelebratingId',
  'Author/Id', 'Author/Title', 'Celebrating/Title'];

export interface IBoardStats { total: number; top: ITopLegend[]; fromSummary: boolean }

export class BoardService {
  constructor(private readonly sp: SPFI, private readonly cfg: IPortalSettings) { }

  private list(): any { return this.sp.web.lists.getByTitle(this.cfg.boardList); }

  private async wrap(paged: any): Promise<IPage<IBoardMessage>> {
    return {
      items: (paged.results as any[]).map(mapBoardMessage),
      hasMore: !!paged.hasNext,
      next: async () => this.wrap(await paged.getNext())
    };
  }

  /** Newest first, `size` at a time. Non-owners only ever see Published items. */
  public async getPage(isOwner: boolean, size: number): Promise<IPage<IBoardMessage>> {
    let q = this.list().items.select(...SELECT).expand('Author', 'Celebrating');
    if (!isOwner) q = q.filter('Published eq 1');
    return this.wrap(await q.orderBy('Created', false).top(size).getPaged());
  }

  public async getFeatured(): Promise<IBoardMessage[]> {
    const rows: any[] = await this.list().items.select(...SELECT).expand('Author', 'Celebrating')
      .filter('Featured eq 1 and Published eq 1').orderBy('Created', false).top(20)();
    return rows.map(mapBoardMessage);
  }

  /**
   * Message total and top celebrated legends. Counts live items up to STATS_THRESHOLD;
   * beyond that, reads the nightly summary from BoardStats instead of scanning.
   */
  public async getStats(): Promise<IBoardStats> {
    const summary = await this.readSummary();
    if (summary) return summary;
    const ids: (number | undefined)[] = [];
    let page: any = await this.list().items.select('Id', 'CelebratingId').filter('Published eq 1').top(1000).getPaged();
    for (;;) {
      (page.results as any[]).forEach(r => ids.push(r.CelebratingId || undefined));
      if (!page.hasNext || ids.length > STATS_THRESHOLD) break;
      page = await page.getNext();
    }
    if (ids.length > STATS_THRESHOLD) {
      const s = await this.readSummary(true);
      if (s) return s;
    }
    return { total: ids.length, top: tallyTopLegends(ids, 3), fromSummary: false };
  }

  private async readSummary(force: boolean = false): Promise<IBoardStats | undefined> {
    if (!this.cfg.boardStatsList) return undefined;
    try {
      const rows: any[] = await this.sp.web.lists.getByTitle(this.cfg.boardStatsList).items.select('Title', 'Value').top(20)();
      const m: { [k: string]: string } = {};
      rows.forEach(r => { m[String(r.Title)] = String(r.Value || ''); });
      if (!m.MessagesShared) return undefined;
      const total = parseInt(m.MessagesShared, 10) || 0;
      if (!force && total <= STATS_THRESHOLD) return undefined; // small boards: live counts are exact
      let top: ITopLegend[] = [];
      try { top = JSON.parse(m.TopLegends || '[]') as ITopLegend[]; } catch { top = []; }
      return { total, top: top.slice(0, 3), fromSummary: true };
    } catch {
      return undefined; // optional list may not exist
    }
  }

  public async add(message: string, celebratingId: number | undefined, tags: TagKey[]): Promise<void> {
    const text = message.trim().slice(0, MAX_MESSAGE);
    const body: { [k: string]: unknown } = { Title: truncate(text, 80), Message: text, Tags: tags, Featured: false, Published: true };
    if (celebratingId) body.CelebratingId = celebratingId;
    await this.list().items.add(body);
  }

  public async setFlag(id: number, field: 'Featured' | 'Published', value: boolean): Promise<void> {
    await this.list().items.getById(id).update({ [field]: value });
  }

  public async remove(id: number): Promise<void> {
    await this.list().items.getById(id).delete();
  }
}
