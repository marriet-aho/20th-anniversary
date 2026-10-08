import * as React from 'react';
import { IBoardMessage, IKeyStat, ILegend, IPage, TagKey } from '../../models';
import { usePortal, useText } from '../PortalContext';
import { useAsync } from '../../hooks/useAsync';
import { ErrorNote } from '../common/States';
import { FeaturedCarousel, Who } from './FeaturedCarousel';
import { PostForm } from './PostForm';
import { tagLabel } from '../../logic/tagSuggest';

const PAGE = 12;
const MEDALS = ['🥇', '🥈', '🥉'];
const ROT = [-1.2, 0.8, -0.6, 1.1, -0.9, 0.5];

const statValue = (stats: IKeyStat[], re: RegExp): string => {
  const s = stats.filter(x => re.test(x.label))[0];
  return s ? s.value : '–';
};

interface IBoardProps { legends: ILegend[]; keyStats: IKeyStat[] }

const Board: React.FC<IBoardProps> = ({ legends, keyStats }) => {
  const { board, user, assets, settings } = usePortal();
  const t = useText();
  const [items, setItems] = React.useState<IBoardMessage[]>([]);
  const [hasMore, setHasMore] = React.useState(false);
  const [loadErr, setLoadErr] = React.useState<string | undefined>();
  const [busyMore, setBusyMore] = React.useState(false);
  const [pager, setPager] = React.useState<IPage<IBoardMessage> | undefined>();

  const stats = useAsync(() => board.getStats(), []);
  const featured = useAsync(() => board.getFeatured(), []);

  const loadFirst = React.useCallback(async (): Promise<void> => {
    try {
      const p = await board.getPage(user.isOwner, PAGE);
      setPager(p);
      setItems(p.items); setHasMore(p.hasMore); setLoadErr(undefined);
    } catch (e) { setLoadErr(e instanceof Error ? e.message : String(e)); }
  }, [board, user.isOwner]);
  React.useEffect(() => { loadFirst().catch(() => undefined); }, [loadFirst]);

  const showMore = async (): Promise<void> => {
    if (!pager) return;
    setBusyMore(true);
    try {
      const nx = await pager.next();
      setPager(nx);
      setItems(cur => cur.concat(nx.items)); setHasMore(nx.hasMore);
    } finally { setBusyMore(false); }
  };

  const refreshAll = (): void => { loadFirst().catch(() => undefined); stats.reload(); featured.reload(); };

  const post = async (text: string, celebratingId: number | undefined, tags: TagKey[]): Promise<void> => {
    await board.add(text, celebratingId, tags);
    refreshAll();
  };
  const flag = async (m: IBoardMessage, f: 'Featured' | 'Published'): Promise<void> => {
    const v = f === 'Featured' ? !m.featured : !m.published;
    await board.setFlag(m.id, f, v);
    setItems(cur => cur.map(x => (x.id === m.id ? { ...x, featured: f === 'Featured' ? v : x.featured, published: f === 'Published' ? v : x.published } : x)));
    stats.reload(); featured.reload();
  };
  const del = async (m: IBoardMessage): Promise<void> => {
    if (!window.confirm('Delete this message?')) return;
    await board.remove(m.id);
    setItems(cur => cur.filter(x => x.id !== m.id));
    stats.reload(); featured.reload();
  };

  const s = stats.data;
  const names = new Map<number, string>(legends.map(l => [l.id, l.name] as [number, string]));
  const top = (s ? s.top : []).filter(x => names.has(x.id));

  return (
    <section className={'oc'} id="wall">
      <div className="oc-wm" aria-hidden="true" style={assets.Watermark ? { backgroundImage: `url(${assets.Watermark})` } : undefined} />
      <div className="w">
        <h2>{t('board.heading')}</h2><p className="lead">{t('board.sub')}</p>
        <div className="oc-st">
          <div className="oc-s"><b>{s ? s.total.toLocaleString() : '–'}</b>Messages Shared</div>
          <div className="oc-s"><b>{statValue(keyStats, /branch/i)}</b>Branches Celebrating</div>
          <div className="oc-s"><b>{statValue(keyStats, /year/i)}</b>Years of Audacious Steps</div>
          <div className="oc-top">
            <h3>{'🏆'} Top Celebrated Legends</h3>
            {top.length ? (
              <ol>{top.map((x, i) => (
                <li key={x.id}><span aria-hidden="true">{MEDALS[i]}</span>
                  <div><b>{names.get(x.id)}</b><small>{x.count} {x.count === 1 ? 'message' : 'messages'}</small></div></li>
              ))}</ol>
            ) : <p>Choose a legend when you post a message and our most celebrated colleagues will appear here.</p>}
          </div>
        </div>

        <FeaturedCarousel items={featured.data || []} />
        {user.isOwner || settings.allowPosting ? <PostForm legends={legends} onPost={post} /> : <div style={{ height: 22 }} />}

        {loadErr ? <ErrorNote what="the board messages" detail={user.isOwner ? loadErr : undefined} onRetry={() => { loadFirst().catch(() => undefined); }} /> : null}
        <div className="oc-wall">
          {items.map((m, i) => {
            const mine = m.authorId === user.id;
            const style = { '--r': ROT[i % 6] + 'deg', '--de': '-' + (i % 7) * 0.9 + 's', '--du': 5 + (i % 4) + 's' } as React.CSSProperties;
            return (
              <article key={m.id} className="oc-card" style={style}>
                <div className="oc-tg">{m.tags.map(x => <span key={x}>{tagLabel(x)}</span>)}</div>
                <p className="oc-t">{m.message}</p>
                <Who m={m} />
                {user.isOwner && !m.published ? <span className="badge">Hidden</span> : null}
                {user.isOwner ? (
                  <div className="oc-acts">
                    <button type="button" className="btn oc-fb" onClick={() => { flag(m, 'Featured').catch(() => undefined); }}>
                      {m.featured ? 'Unfeature' : 'Feature'}</button>
                    <button type="button" className="btn oc-fb" onClick={() => { flag(m, 'Published').catch(() => undefined); }}>
                      {m.published ? 'Hide' : 'Unhide'}</button>
                  </div>
                ) : null}
                {user.isOwner || mine ? (
                  <button type="button" className="btn oc-fb oc-del" onClick={() => { del(m).catch(() => undefined); }}>Delete</button>
                ) : null}
              </article>
            );
          })}
          {!items.length && !loadErr ? <p className="oc-empty">No messages yet. Be the first to share one.</p> : null}
        </div>
        {hasMore ? <p style={{ textAlign: 'center', marginTop: 26 }}>
          <button type="button" className="btn" disabled={busyMore} onClick={() => { showMore().catch(() => undefined); }}>Show more messages</button></p> : null}
      </div>
    </section>
  );
};

export default Board;
