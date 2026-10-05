import * as React from 'react';
import { IGalleryComment, IGalleryItem, IReactionSummary, ReactionKind } from '../../models';
import { usePortal } from '../PortalContext';
import { REACTIONS } from '../../logic/reactionKey';
import { Modal } from '../common/Modal';
import { Loading } from '../common/States';

interface IProps { item: IGalleryItem; onClose: () => void; onLikesChanged: (id: number, n: number) => void }

const GalleryLightbox: React.FC<IProps> = ({ item, onClose, onLikesChanged }) => {
  const { gallery, reactions, user } = usePortal();
  const [sum, setSum] = React.useState<IReactionSummary | undefined>();
  const [comments, setComments] = React.useState<IGalleryComment[] | undefined>();
  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState('');

  React.useEffect(() => {
    let live = true;
    reactions.forItem(item.id).then(s => { if (live) setSum(s); }, () => { if (live) setMsg('Reactions could not be loaded.'); });
    gallery.getComments(item.id, user.isOwner).then(c => { if (live) setComments(c); }, () => { if (live) setComments([]); });
    return () => { live = false; };
  }, [item.id, gallery, reactions, user.isOwner]);

  const react = async (k: ReactionKind): Promise<void> => {
    if (!sum || busy) return;
    setBusy(true); setMsg('');
    try {
      const n = await reactions.toggle(item.id, k, sum);
      setSum(n);
      if (k === 'Like') onLikesChanged(item.id, n.counts.Like);
    } catch { setMsg('Sorry, that did not save. Please try again.'); } finally { setBusy(false); }
  };
  const comment = async (): Promise<void> => {
    if (!text.trim()) return;
    setBusy(true); setMsg('');
    try {
      await gallery.addComment(item.id, text, user.displayName);
      setText('');
      setComments(await gallery.getComments(item.id, user.isOwner));
    } catch { setMsg('Sorry, your comment could not be posted.'); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} label={item.title}>
      {item.isVideo
        ? <video controls playsInline preload="metadata" src={item.url} />
        : <img alt={item.title} src={item.url} />}
      <h3>{item.title}</h3>
      <p style={{ color: 'var(--t2)' }}>
        {[item.credit, item.branch, item.department, item.category].filter(Boolean).join(', ')}
      </p>
      <div className="rx" role="group" aria-label="Reactions">
        {REACTIONS.map(r => (
          <button key={r.kind} type="button" className="btn" disabled={!sum || busy}
            aria-pressed={!!(sum && sum.mine[r.kind])} aria-label={r.label}
            onClick={() => { react(r.kind).catch(() => undefined); }}>
            <span aria-hidden="true">{r.emoji}</span> {sum ? sum.counts[r.kind] : 0}
          </button>
        ))}
      </div>
      <h4>Comments</h4>
      {!comments ? <Loading /> : comments.length ? comments.map(c => <p key={c.id}><b>{c.authorName}:</b> {c.text}</p>) : <p className="state">Be the first to comment.</p>}
      <textarea rows={2} placeholder="Add a comment" aria-label="Comment" maxLength={1000} value={text} onChange={e => setText(e.target.value)} />
      <button type="button" className="btn" disabled={busy} onClick={() => { comment().catch(() => undefined); }}>Comment</button>
      <small role="status" aria-live="polite">{msg}</small>
    </Modal>
  );
};

export default GalleryLightbox;
