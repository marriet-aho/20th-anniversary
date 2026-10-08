/* eslint-disable @typescript-eslint/no-explicit-any */
import { SPFI } from '../services/sp';

export type Row = { [key: string]: any };
export interface IFakeOptions { userId?: number; isOwner?: boolean; ownerGroupMember?: boolean; pageSize?: number; rejectExpand?: string[] }
export interface IFakeCall { list: string; op: string; filter?: string; select?: string[]; order?: string[]; top?: number; body?: Row }

/** Evaluates the small OData subset the services use: eq / ne, and, or, parentheses, substringof. */
export function matches(row: Row, filter: string): boolean {
  const f = filter.trim();
  if (!f) return true;
  const parts = (s: string, word: string): string[] => {
    const out: string[] = []; let depth = 0, cur = '', inStr = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === "'") inStr = !inStr;
      if (!inStr) { if (c === '(') depth++; if (c === ')') depth--; }
      if (!inStr && depth === 0 && s.substr(i, word.length + 2) === ' ' + word + ' ') { out.push(cur); cur = ''; i += word.length + 1; continue; }
      cur += c;
    }
    out.push(cur);
    return out;
  };
  const ands = parts(f, 'and');
  if (ands.length > 1) return ands.every(a => matches(row, a));
  const ors = parts(f, 'or');
  if (ors.length > 1) return ors.some(a => matches(row, a));
  if (f[0] === '(' && f[f.length - 1] === ')') return matches(row, f.slice(1, -1));
  let m = f.match(/^substringof\('(.*)',(\w+)\)$/);
  if (m) return String(row[m[2]] || '').toLowerCase().indexOf(m[1].replace(/''/g, "'").toLowerCase()) > -1;
  m = f.match(/^(\w+) (eq|ne) (.+)$/);
  if (!m) throw new Error('Fake SP cannot parse filter: ' + f);
  let want: any = m[3];
  if (want === 'null') want = null;
  else if (want[0] === "'") want = want.slice(1, -1).replace(/''/g, "'");
  else want = +want;
  let have: any = row[m[1]];
  if (typeof have === 'boolean') have = have ? 1 : 0;
  if (have === undefined) have = null;
  return m[2] === 'eq' ? have === want : have !== want;
}

type Q = ((() => Promise<Row[]>) & {
  select: (...a: string[]) => Q; expand: (...a: string[]) => Q; filter: (f: string) => Q;
  orderBy: (c: string, asc?: boolean) => Q; top: (n: number) => Q;
  add: (body: Row) => Promise<any>; getById: (id: number) => any;
});

function makeQuery(store: { [list: string]: Row[] }, list: string, calls: IFakeCall[], opts: IFakeOptions,
  userId: number): Q {
  const st = { f: '', o: [] as string[], t: 100, s: [] as string[], x: false };
  const run = (): Row[] => {
    if (st.x && (opts.rejectExpand || []).indexOf(list) > -1) throw new Error('The query to field is not valid. expand');
    const rows = (store[list] || []).filter(r => matches(r, st.f)).slice();
    st.o.slice().reverse().forEach(spec => {
      const [c, dir] = spec.split(' ');
      rows.sort((a, b) => {
        const x = a[c] === undefined ? '' : a[c], y = b[c] === undefined ? '' : b[c];
        const r = (typeof x === 'boolean' ? +x : x) < (typeof y === 'boolean' ? +y : y) ? -1 : (x === y ? 0 : 1);
        return dir === 'desc' ? -r : r;
      });
    });
    calls.push({ list, op: 'get', filter: st.f, select: st.s, order: st.o, top: st.t });
    return rows;
  };
  const nextId = (): number => (store[list] || []).reduce((m, r) => Math.max(m, r.Id || 0), 0) + 1;
  const uniqueKey: { [l: string]: string } = { GalleryReactions: 'ReactionKey' };
  const q: any = (): Promise<Row[]> => {
    try { return Promise.resolve(run().slice(0, st.t)); } catch (e) { return Promise.reject(e); }
  };
  q.select = (...a: string[]): Q => { st.s = a; return q; };
  q.expand = (): Q => { st.x = true; return q; };
  q.filter = (f: string): Q => { st.f = f; return q; };
  q.orderBy = (c: string, asc: boolean = true): Q => { st.o.push(c + (asc ? ' asc' : ' desc')); return q; };
  q.top = (n: number): Q => { st.t = n; return q; };
  (q as any)[(Symbol as unknown as { asyncIterator: symbol }).asyncIterator] = () => {
    let all: Row[] | undefined, i = 0, done = false;
    const size = (): number => Math.min(st.t, opts.pageSize || st.t);
    return {
      next: (): Promise<{ done: boolean; value?: Row[] }> => {
        try {
          all = all || run();
          if (done || i >= all.length) { done = true; return Promise.resolve({ done: true }); }
          const value = all.slice(i, i + size()); i += size();
          return Promise.resolve({ done: false, value });
        } catch (e) { return Promise.reject(e); }
      }
    };
  };
  q.add = (body: Row): Promise<any> => {
    calls.push({ list, op: 'add', body });
    const k = uniqueKey[list];
    if (k && (store[list] || []).some(r => r[k] === body[k])) return Promise.reject(new Error('duplicate value'));
    const row = { ...body, Id: nextId(), AuthorId: userId, Author: { Id: userId, Title: 'Me' }, Created: new Date().toISOString() };
    if (body.CelebratingId) { const l = (store.Legends || []).filter(x => x.Id === body.CelebratingId)[0]; if (l) (row as Row).Celebrating = { Title: l.Title }; }
    (store[list] = store[list] || []).push(row);
    return Promise.resolve(row);
  };
  q.getById = (id: number): any => ({
    update: (body: Row): Promise<void> => {
      calls.push({ list, op: 'update', body });
      const r = (store[list] || []).filter(x => x.Id === id)[0];
      if (r) Object.assign(r, body);
      return Promise.resolve();
    },
    delete: (): Promise<void> => { calls.push({ list, op: 'delete' }); store[list] = (store[list] || []).filter(x => x.Id !== id); return Promise.resolve(); }
  });
  return q as Q;
}

export function createFakeSp(data: { [list: string]: Row[] }, opts: IFakeOptions = {}): { sp: SPFI; calls: IFakeCall[]; data: { [list: string]: Row[] } } {
  const calls: IFakeCall[] = [];
  const userId = opts.userId === undefined ? 7 : opts.userId;
  const sp: any = {
    web: {
      lists: {
        getByTitle: (n: string) => {
          if (!(n in data)) throw new Error("List '" + n + "' does not exist");
          return { items: makeQuery(data, n, calls, opts, userId) };
        }
      },
      currentUserHasPermissions: () => Promise.resolve(!!opts.isOwner),
      siteGroups: {
        getByName: () => ({
          users: { getById: () => () => (opts.ownerGroupMember ? Promise.resolve({}) : Promise.reject(new Error('not found'))) }
        })
      }
    }
  };
  return { sp: sp as SPFI, calls, data };
}
