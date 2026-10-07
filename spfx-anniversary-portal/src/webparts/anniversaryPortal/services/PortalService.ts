import { SPFI } from './sp';
import { Cache } from './cache';
import {
  AssetType, IContentMap, IKeyStat, ILeadershipMessage, ILegend, ILookupOption, IMemory, IPortalSettings,
  ITimelineItem, IUserInfo, PortalAssets
} from '../models';
import { mapKeyStat, mapLeadershipMessage, mapLegend, mapMemory, mapTimeline } from './mappers';

/* eslint-disable @typescript-eslint/no-explicit-any */
const PAGE = 500;
/** PermissionKind.ManageLists. Kept as a number so unit tests do not need the ESM-only @pnp/sp/security. */
const MANAGE_LISTS = 12;

export class PortalService {
  private readonly cache = new Cache();

  constructor(private readonly sp: SPFI, private readonly cfg: IPortalSettings,
    private readonly user: { id: number; displayName: string }, private readonly webServerRelativeUrl: string = '') { }

  private list(name: string): any {
    return this.sp.web.lists.getByTitle(name);
  }

  public getContent(): Promise<IContentMap> {
    return this.cache.get('content', async () => {
      const rows: any[] = await this.list(this.cfg.contentList).items
        .select('Title', 'Value', 'DateValue').top(PAGE)();
      const map: IContentMap = {};
      rows.forEach(r => { map[String(r.Title)] = { value: r.Value ? String(r.Value) : '', date: r.DateValue || undefined }; });
      return map;
    });
  }

  public getTimeline(): Promise<ITimelineItem[]> {
    return this.cache.get('timeline', async () => {
      const rows: any[] = await this.list(this.cfg.timelineList).items
        .select('Id', 'Title', 'Year', 'SortOrder').orderBy('SortOrder', true).top(PAGE)();
      return rows.map(mapTimeline);
    });
  }

  public getKeyStats(): Promise<IKeyStat[]> {
    return this.cache.get('stats', async () => {
      const rows: any[] = await this.list(this.cfg.keyStatsList).items
        .select('Id', 'Title', 'Value', 'SortOrder').orderBy('SortOrder', true).top(PAGE)();
      return rows.map(mapKeyStat);
    });
  }

  public getLegends(): Promise<ILegend[]> {
    return this.cache.get('legends', async () => {
      const cols = ['Id', 'Title', 'Position', 'Joined', 'Quote', 'CareerHighlights', 'FunFact', 'Photo', 'SortOrder', 'Active'];
      const query = (select: string[], expand: string[]): Promise<any[]> => {
        let q = this.list(this.cfg.legendsList).items.select(...select);
        if (expand.length) q = q.expand(...expand);
        return q.filter('Active eq 1').orderBy('SortOrder', true).top(PAGE)();
      };
      let rows: any[];
      try {
        // Department and Branch as lookup columns...
        rows = await query(cols.concat('Department/Title', 'Branch/Title'), ['Department', 'Branch']);
      } catch {
        // ...or as plain text columns (no expand allowed).
        rows = await query(cols.concat('Department', 'Branch'), []);
      }
      return rows.map(r => mapLegend(r, { webServerRelativeUrl: this.webServerRelativeUrl, listName: this.cfg.legendsList, itemId: r.Id }));
    });
  }

  public getMemoryLane(): Promise<IMemory[]> {
    return this.cache.get('memory', async () => {
      const rows: any[] = await this.list(this.cfg.memoryList).items
        .select('Id', 'Title', 'Year', 'Photo', 'SortOrder').orderBy('SortOrder', true).top(PAGE)();
      return rows.map(r => mapMemory(r, { webServerRelativeUrl: this.webServerRelativeUrl, listName: this.cfg.memoryList, itemId: r.Id }));
    });
  }

  public getLeadershipMessages(): Promise<ILeadershipMessage[]> {
    return this.cache.get('voices', async () => {
      const rows: any[] = await this.list(this.cfg.messagesList).items
        .select('Id', 'Title', 'Message', 'SortOrder').orderBy('SortOrder', true).top(PAGE)();
      return rows.map(mapLeadershipMessage);
    });
  }

  public getLookup(kind: 'branches' | 'departments'): Promise<ILookupOption[]> {
    return this.cache.get(kind, async () => {
      const name = kind === 'branches' ? this.cfg.branchesList : this.cfg.departmentsList;
      const cols = kind === 'branches' ? ['Id', 'Title', 'Region'] : ['Id', 'Title'];
      const rows: any[] = await this.list(name).items
        .select(...cols).filter('Active eq 1').orderBy('Title', true).top(PAGE)();
      return rows.map(r => ({ id: r.Id as number, title: String(r.Title), region: r.Region ? String(r.Region) : undefined }));
    });
  }

  /** The Active file of each AssetType, as a server-relative URL. */
  public getAssets(): Promise<PortalAssets> {
    return this.cache.get('assets', async () => {
      const rows: any[] = await this.list(this.cfg.assetsLibrary).items
        .select('Id', 'Title', 'AssetType', 'Active', 'FileRef').filter('Active eq 1').orderBy('Id', false).top(PAGE)();
      const out: PortalAssets = {};
      rows.forEach(r => {
        // The board watermark is an "Other" asset titled "Watermark" (the AssetType list has no dedicated choice).
        const t = (String(r.AssetType) === 'Other' && /^watermark$/i.test(String(r.Title || ''))
          ? 'Watermark' : String(r.AssetType)) as AssetType;
        if (t && !out[t]) out[t] = String(r.FileRef); // newest first, so the newest Active wins
      });
      return out;
    });
  }

  /** Owner = can manage lists on this site, or a member of the configured Portal Owners group. */
  public getUser(): Promise<IUserInfo> {
    return this.cache.get('user', async () => {
      let isOwner = false;
      try {
        isOwner = await this.sp.web.currentUserHasPermissions(MANAGE_LISTS);
      } catch { /* treat as not an owner */ }
      if (!isOwner && this.cfg.ownersGroup) {
        try {
          await this.sp.web.siteGroups.getByName(this.cfg.ownersGroup).users.getById(this.user.id)();
          isOwner = true;
        } catch { /* not a member, or no access to read the group */ }
      }
      return { id: this.user.id, displayName: this.user.displayName, isOwner };
    });
  }
}
