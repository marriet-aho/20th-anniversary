import * as React from 'react';
import { IGalleryItem, ILookupOption, IPage } from '../../models';
import { usePortal } from '../PortalContext';
import { useAsync, useDebounced } from '../../hooks/useAsync';
import { Section } from '../common/Section';
import { Empty, ErrorNote, Loading } from '../common/States';
import { GALLERY_CATEGORIES, IGalleryQuery } from '../../services/GalleryService';

const Lightbox = React.lazy(() => import(/* webpackChunkName: 'gallery-lightbox' */ './GalleryLightbox'));
const PAGE = 12;

const Card: React.FC<{ item: IGalleryItem; likes: number; onOpen: () => void }> = ({ item, likes, onOpen }) => {
  const { gallery, webUrl, user } = usePortal();
  const [broken, setBroken] = React.useState(false);
  return (
    <figure className="gi">
      {item.featured ? <span className="fv">Featured</span> : null}
      {user.isOwner && !item.published ? <span className="fv hid">Hidden</span> : null}
      <button type="button" className="gi-media" aria-label={'Open ' + item.title} onClick={onOpen}>
        {broken || !item.url
          ? <div className="ph">{item.category || item.title}</div>
          : <img alt={item.title} loading="lazy" src={gallery.thumbnail(item, webUrl)} onError={() => setBroken(true)} />}
      </button>
      <figcaption>
        <span>{item.title}</span>
        <span className="gi-like" aria-label={likes + (likes === 1 ? ' like' : ' likes')}>{'♥'} {likes}</span>
      </figcaption>
    </figure>
  );
};

const Gallery: React.FC = () => {
  const { gallery, portal, reactions, user } = usePortal();
  const [open, setOpen] = React.useState(true);
  const [category, setCategory] = React.useState('All');
  const [branch, setBranch] = React.useState('');
  const [region, setRegion] = React.useState('');
  const [departmentId, setDepartmentId] = React.useState('');
  const [search, setSearch] = React.useState('');
  const dsearch = useDebounced(search, 300);
  const dbranch = useDebounced(branch, 300);
  const dregion = useDebounced(region, 300);

  const [items, setItems] = React.useState<IGalleryItem[]>([]);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | undefined>();
  const [likes, setLikes] = React.useState<{ [id: number]: number }>({});
  const [current, setCurrent] = React.useState<IGalleryItem | undefined>();
  const pager = React.useRef<IPage<IGalleryItem>>();
  const req = React.useRef(0);
  const sentinel = React.useRef<HTMLDivElement>(null);

  const total = useAsync(() => gallery.count(user.isOwner), [user.isOwner]);
  const branches = useAsync<ILookupOption[]>(() => portal.getLookup('branches'), []);
  const departments = useAsync<ILookupOption[]>(() => portal.getLookup('departments'), []);
  const regions = Array.from(new Set((branches.data || []).map(b => b.region || '').filter(Boolean)));

  const addLikes = React.useCallback((page: IGalleryItem[]): void => {
    reactions.likeCounts(page.map(i => i.id)).then(c => setLikes(cur => ({ ...cur, ...c })), () => undefined);
  }, [reactions]);

  // New query: reset to the first page. Stale responses are ignored.
  React.useEffect(() => {
    if (!open) return;
    const q: IGalleryQuery = { category, branch: dbranch, region: dregion,
      departmentId: departmentId ? +departmentId : undefined, search: dsearch };
    const id = ++req.current;
    setLoading(true); setErr(undefined);
    gallery.getPage(q, user.isOwner, PAGE).then(p => {
      if (id !== req.current) return;
      pager.current = p; setItems(p.items); setHasMore(p.hasMore); setLoading(false); addLikes(p.items);
    }, (e: unknown) => {
      if (id !== req.current) return;
      setErr(e instanceof Error ? e.message : String(e)); setLoading(false);
    });
  }, [open, category, dbranch, dregion, departmentId, dsearch, user.isOwner, gallery, addLikes]);

  const loadMore = React.useCallback((): void => {
    const p = pager.current;
    if (!p || loading) return;
    const id = req.current;
    setLoading(true);
    p.next().then(n => {
      if (id !== req.current) return;
      pager.current = n; setItems(cur => cur.concat(n.items)); setHasMore(n.hasMore); setLoading(false); addLikes(n.items);
    }, () => setLoading(false));
  }, [loading, addLikes]);

  // Infinite scroll with the button as the accessible fallback.
  React.useEffect(() => {
    if (!hasMore || !sentinel.current || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) loadMore(); }, { rootMargin: '200px' });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [hasMore, loadMore]);

  const label = open ? 'Hide gallery' : 'Show gallery' + (total.data !== undefined ? ' (' + total.data + ')' : '');
  const cats = ['All', 'Featured'].concat(GALLERY_CATEGORIES);

  return (
    <Section k="gallery" manage={{ name: 'GalleryMedia', library: true }}>
      <p><button type="button" className="btn" aria-controls="gbody" aria-expanded={open} onClick={() => setOpen(o => !o)}>{label}</button></p>
      <div id="gbody" hidden={!open}>
        <div className="gb" role="group" aria-label="Categories">
          {cats.map(c => <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>)}
        </div>
        <div className="gf">
          <input type="search" placeholder="Search photos" aria-label="Search photos" value={search} onChange={e => setSearch(e.target.value)} />
          <input type="text" list="gal-branches" placeholder="Type a branch" aria-label="Branch" value={branch}
            onChange={e => setBranch(e.target.value)} />
          <datalist id="gal-branches">{(branches.data || []).map(b => <option key={b.id} value={b.title} />)}</datalist>
          <input type="text" list="gal-regions" placeholder="Type a region" aria-label="Region" value={region}
            onChange={e => setRegion(e.target.value)} />
          <datalist id="gal-regions">{regions.map(r => <option key={r} value={r} />)}</datalist>
          <select className="inp" aria-label="Department" value={departmentId} onChange={e => setDepartmentId(e.target.value)}>
            <option value="">All departments</option>
            {(departments.data || []).map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
        </div>
        {err ? <ErrorNote what="the gallery" detail={user.isOwner ? err : undefined} /> : null}
        <div className="mas">
          {items.map(i => <Card key={i.id} item={i} likes={likes[i.id] || 0} onOpen={() => setCurrent(i)} />)}
        </div>
        {!loading && !err && !items.length ? <Empty>No posts match. Clear the filters or check back soon.</Empty> : null}
        {loading ? <Loading label="Loading photos…" /> : null}
        <div ref={sentinel} style={{ height: 2 }} />
        {hasMore && !loading ? <p style={{ textAlign: 'center' }}><button type="button" className="btn" onClick={loadMore}>Load more</button></p> : null}
      </div>
      {current ? (
        <React.Suspense fallback={null}>
          <Lightbox item={current} onClose={() => setCurrent(undefined)}
            onLikesChanged={(id, n) => setLikes(cur => ({ ...cur, [id]: n }))} />
        </React.Suspense>
      ) : null}
    </Section>
  );
};

export default Gallery;
