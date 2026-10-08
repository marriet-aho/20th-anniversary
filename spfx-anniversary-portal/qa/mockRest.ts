/* eslint-disable @typescript-eslint/no-explicit-any */
// A strict stand-in for the SharePoint REST API. The real PnPjs client talks to it over window.fetch, so what
// is exercised is the production request building, parsing and paging. It rejects what SharePoint rejects.
import { matches, Row } from '../src/webparts/anniversaryPortal/testing/fakeSp';

export type Kind = 'text' | 'lookup' | 'other';
export interface ISchema { [list: string]: { [field: string]: Kind } }
export interface IMockOpts { userId: number; isOwner: boolean; ownerGroupMember: boolean; pageSize: number }

const BUILTIN = ['Id', 'ID', 'Title', 'Created', 'Modified', 'Author', 'AuthorId', 'Editor', 'EditorId', 'File', 'FileRef', 'FileLeafRef', 'ContentType'];
export const requestLog: string[] = [];
(window as any).__rest = [] as { req: string; status: number; msg: string }[];

const json = (status: number, body: unknown): Response =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json;odata=minimalmetadata' } });
const spError = (status: number, msg: string): Response =>
  json(status, { 'odata.error': { code: '-1, Microsoft.SharePoint.SPException', message: { lang: 'en-US', value: msg } } });

export function installMockRest(data: { [list: string]: Row[] }, schema: ISchema, opts: IMockOpts): void {
  const header = (init: RequestInit | undefined, name: string): string => {
    const h: any = init && init.headers;
    if (!h) return '';
    if (typeof h.get === 'function') return h.get(name) || '';
    const k = Object.keys(h).filter(x => x.toLowerCase() === name.toLowerCase())[0];
    return k ? String(h[k]) : '';
  };
  const real = window.fetch.bind(window);

  const handle = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : (input as Request).url || String(input));
    const apiAt = url.pathname.indexOf('/_api/');
    if (apiAt < 0) return real(input as any, init);
    const path = decodeURIComponent(url.pathname.slice(apiAt + 6));
    const method = (init && init.method || 'GET').toUpperCase();
    const override = header(init, 'X-HTTP-Method').toUpperCase();
    requestLog.push(`${override || method} ${path}${url.search ? decodeURIComponent(url.search).replace(/\+/g, ' ') : ''}`);

    if (/^web\/EffectiveBasePermissions$/.test(path)) {
      return json(200, opts.isOwner ? { High: 2147483647, Low: 4294967295 } : { High: 0, Low: 1 });
    }
    let m = path.match(/^web\/siteGroups\/getByName\('([^']+)'\)\/users\/getById\((\d+)\)$/);
    if (m) return opts.ownerGroupMember ? json(200, { Id: +m[2] }) : spError(404, 'User cannot be found.');

    // owner upload: file into the library, then its list item
    m = path.match(/^web\/lists\/getByTitle\('([^']+)'\)\/rootFolder\/files\/AddUsingPath\(decodedurl='([^']+)'(?:,Overwrite=true)?\)$/);
    if (m) {
      if (!schema[m[1]]) return spError(404, `List '${m[1]}' does not exist at site with URL '${url.origin}'.`);
      if (!opts.isOwner) return spError(403, 'Access denied. You do not have permission to perform this action or access this resource.');
      if (method !== 'POST') return spError(405, 'Method not allowed');
      const rowsG = data[m[1]] || (data[m[1]] = []);
      const name = m[2];
      if (/[~"#%&*:<>?/\\{|}]/.test(name)) return spError(400, 'The file name contains characters that are not allowed.');
      if (rowsG.some(r => r.File && r.File.Name === name)) return spError(409, 'A file with this name already exists.');
      const srv = '/sites/InfoPortal/' + m[1] + '/' + name;
      const rowU: Row = { Id: rowsG.reduce((mx, r) => Math.max(mx, r.Id || 0), 0) + 1, Title: name.replace(/\.[^.]+$/, ''), Published: true,
        FileRef: 'media/logo-20th-anniversary.webp', File: { Name: name, ServerRelativeUrl: 'media/logo-20th-anniversary.webp', __srv: srv }, Created: new Date().toISOString(), __bytes: (init && init.body && (init.body as Blob).size) || 0 };
      rowsG.push(rowU);
      return json(200, { Name: name, ServerRelativeUrl: srv });
    }
    m = path.match(/^web\/getFileByServerRelativePath\(decodedUrl='([^']+)'\)\/listItemAllFields$/);
    if (m) {
      for (const l of Object.keys(data)) { const r = data[l].filter(x => x.File && x.File.__srv === m![1])[0]; if (r) return json(200, { Id: r.Id }); }
      return spError(404, 'File Not Found.');
    }
    m = path.match(/^web\/lists\/getByTitle\('([^']+)'\)\/items\((\d+)\)\/recycle$/);
    if (m) {
      if (!opts.isOwner) return spError(403, 'Access denied.');
      data[m[1]] = (data[m[1]] || []).filter(x => x.Id !== +m![2]);
      return json(200, { value: 'recycled' });
    }

    m = path.match(/^web\/lists\/getByTitle\('([^']+)'\)\/items(?:\((\d+)\))?$/);
    if (!m) return spError(404, 'Unsupported request in the stand-in: ' + path);
    const list = m[1], id = m[2] ? +m[2] : 0;
    const fields = schema[list];
    if (!fields) return spError(404, `List '${list}' does not exist at site with URL '${url.origin}'.`);
    const rows = data[list] || (data[list] = []);

    const known = (f: string): boolean => {
      if (BUILTIN.indexOf(f) > -1 || f in fields) return true;
      return /Id$/.test(f) && fields[f.slice(0, -2)] === 'lookup';
    };
    const missing = (f: string): Response => spError(400, `The field or property '${f}' does not exist.`);

    if (method === 'GET') {
      const sel = (url.searchParams.get('$select') || '').split(',').filter(Boolean);
      const exp = (url.searchParams.get('$expand') || '').split(',').filter(Boolean);
      const flt = url.searchParams.get('$filter') || '';
      const ord = (url.searchParams.get('$orderby') || '').split(',').filter(Boolean).map(x => x.trim().split(/\s+/));
      const bad = (f: string): Response => spError(400, `The query to field '${f}' is not valid. The $select query string must specify the target fields and the $expand query string must contains ${f}.`);
      for (const e of exp) {
        if (!known(e)) return missing(e);
        if (BUILTIN.indexOf(e) < 0 && fields[e] !== 'lookup') return bad(e);
      }
      for (const f of sel) {
        const base = f.split('/')[0];
        if (!known(base)) return missing(base);
        if (f.indexOf('/') > -1 && exp.indexOf(base) < 0) return bad(base);
      }
      const idents = flt.match(/(?:^|[\s(])([A-Za-z_]\w*)(?= (?:eq|ne) )/g) || [];
      for (const raw of idents) { const f = raw.trim().replace('(', ''); if (!known(f)) return missing(f); }
      const sub = flt.match(/substringof\('(?:[^']|'')*',(\w+)\)/g) || [];
      for (const s of sub) { const f = (s.match(/,(\w+)\)$/) as RegExpMatchArray)[1]; if (!known(f)) return missing(f); }
      for (const [f] of ord) if (!known(f)) return missing(f);

      let out = rows.filter(r => matches(r, flt));
      ord.slice().reverse().forEach(([f, dir]) => {
        out = out.slice().sort((a, b) => {
          const x = a[f] === undefined ? '' : a[f], y = b[f] === undefined ? '' : b[f];
          const r = (typeof x === 'boolean' ? +x : x) < (typeof y === 'boolean' ? +y : y) ? -1 : (x === y ? 0 : 1);
          return dir === 'desc' ? -r : r;
        });
      });
      if (id) out = rows.filter(r => r.Id === id);
      const top = +(url.searchParams.get('$top') || 100);
      const skip = +((url.searchParams.get('$skiptoken') || '').replace(/^o/, '') || 0);
      const size = top;
      const page = out.slice(skip, skip + size);
      const shaped = page.map(r => {
        if (!sel.length) return r;
        const o: Row = {};
        for (const f of sel) {
          if (f.indexOf('/') > -1) { const [b, s] = f.split('/'); o[b] = o[b] || {}; o[b][s] = r[b] ? r[b][s] : undefined; }
          else o[f] = r[f];
        }
        return o;
      });
      const body: any = { 'odata.metadata': `${url.origin}/_api/$metadata#items`, value: shaped };
      if (skip + size < out.length && !id) {
        const next = new URL(url.toString());
        next.searchParams.set('$skiptoken', 'o' + (skip + size));
        body['odata.nextLink'] = next.toString();
      }
      return json(200, id ? (shaped[0] || {}) : body);
    }

    if (method === 'POST' && !override && !id) {
      const body = JSON.parse(String(init && init.body || '{}'));
      for (const k of Object.keys(body)) if (!known(k)) return missing(k);
      if (list === 'GalleryReactions' && rows.some(r => r.ReactionKey === body.ReactionKey)) {
        return spError(400, 'Duplicate value: the column ReactionKey requires unique values.');
      }
      const row: Row = { ...body, Id: rows.reduce((mx, r) => Math.max(mx, r.Id || 0), 0) + 1, AuthorId: opts.userId,
        Author: { Id: opts.userId, Title: 'Ama Mensah' }, Created: new Date().toISOString() };
      if (body.CelebratingId) { const l = (data.Legends || []).filter(x => x.Id === body.CelebratingId)[0]; if (l) row.Celebrating = { Title: l.Title }; }
      rows.push(row);
      return json(201, row);
    }
    if (method === 'POST' && override === 'MERGE' && id) {
      const body = JSON.parse(String(init && init.body || '{}'));
      for (const k of Object.keys(body)) if (!known(k)) return missing(k);
      const r = rows.filter(x => x.Id === id)[0];
      if (!r) return spError(404, 'Item does not exist.');
      Object.assign(r, body);
      return new Response(null, { status: 204 });
    }
    if (method === 'POST' && override === 'DELETE' && id) {
      data[list] = rows.filter(x => x.Id !== id);
      return new Response(null, { status: 200 });
    }
    return spError(400, 'Unsupported method in the stand-in: ' + method + ' ' + override);
  };
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const u = String(typeof input === 'string' ? input : (input as Request).url || input);
    const label = (String((init && init.method) || 'GET').toUpperCase()) + ' ' + decodeURIComponent(u).replace(/^.*\/_api\//, '').replace(/\+/g, ' ');
    const res = await handle(input, init);
    if (u.indexOf('/_api/') > -1) {
      let msg = '';
      if (res.status >= 400) { try { msg = ((await res.clone().json())['odata.error'].message.value) as string; } catch { msg = ''; } }
      (window as any).__rest.push({ req: label, status: res.status, msg });
    }
    return res;
  };
}