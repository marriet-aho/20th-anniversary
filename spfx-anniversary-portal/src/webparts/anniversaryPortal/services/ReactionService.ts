import { SPFI } from './sp';
import { IPortalSettings, IReactionSummary, ReactionKind } from '../models';
import { reactionKey, REACTIONS } from '../logic/reactionKey';

/* eslint-disable @typescript-eslint/no-explicit-any */
const empty = (): IReactionSummary => ({
  counts: { Like: 0, Clap: 0, Celebrate: 0, Love: 0 },
  mine: { Like: undefined, Clap: undefined, Celebrate: undefined, Love: undefined }
});

export class ReactionService {
  constructor(private readonly sp: SPFI, private readonly cfg: IPortalSettings, private readonly userId: number) { }

  private list(): any { return this.sp.web.lists.getByTitle(this.cfg.reactionsList); }

  public summarise(rows: { Id: number; Reaction: string; AuthorId?: number; Author?: { Id: number } }[]): IReactionSummary {
    const s = empty();
    rows.forEach(r => {
      const k = r.Reaction as ReactionKind;
      if (!(k in s.counts)) return;
      s.counts[k]++;
      const author = r.AuthorId !== undefined ? r.AuthorId : r.Author ? r.Author.Id : undefined;
      if (author === this.userId) s.mine[k] = r.Id;
    });
    return s;
  }

  public async forItem(itemId: number): Promise<IReactionSummary> {
    const rows: any[] = await this.list().items.select('Id', 'Reaction', 'AuthorId')
      .filter('GalleryItemId eq ' + itemId).top(5000)();
    return this.summarise(rows);
  }

  /** Like counts for one page of grid cards in a single query. */
  public async likeCounts(itemIds: number[]): Promise<{ [id: number]: number }> {
    const out: { [id: number]: number } = {};
    if (!itemIds.length) return out;
    const f = "Reaction eq 'Like' and (" + itemIds.map(i => 'GalleryItemId eq ' + i).join(' or ') + ')';
    const rows: any[] = await this.list().items.select('GalleryItemId').filter(f).top(5000)();
    rows.forEach(r => { out[r.GalleryItemId as number] = (out[r.GalleryItemId as number] || 0) + 1; });
    return out;
  }

  /** Toggle: delete my row if I already reacted, else add one. The unique ReactionKey is the real guard. */
  public async toggle(itemId: number, kind: ReactionKind, current: IReactionSummary): Promise<IReactionSummary> {
    const mineId = current.mine[kind];
    const next: IReactionSummary = { counts: { ...current.counts }, mine: { ...current.mine } };
    if (mineId) {
      await this.list().items.getById(mineId).delete();
      next.counts[kind] = Math.max(0, next.counts[kind] - 1);
      next.mine[kind] = undefined;
      return next;
    }
    try {
      const r: any = await this.list().items.add({
        Title: kind + ' on ' + itemId, GalleryItemId: itemId, Reaction: kind, ReactionKey: reactionKey(itemId, this.userId, kind)
      });
      next.counts[kind]++;
      next.mine[kind] = (r && (r.Id || (r.data && r.data.Id))) as number | undefined;
    } catch {
      // Duplicate ReactionKey: the reaction already exists (e.g. another tab). Re-read the truth.
      return this.forItem(itemId);
    }
    return next;
  }

  public static kinds(): ReactionKind[] { return REACTIONS.map(r => r.kind); }
}
