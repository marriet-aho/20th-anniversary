import * as React from 'react';
import { IGalleryItem, ILookupOption, IReactionSummary, ReactionKind } from '../../models';
import { usePortal } from '../PortalContext';
import { REACTIONS } from '../../logic/reactionKey';
import { Modal } from '../common/Modal';
import { EditPhoto } from './OwnerTools';

interface IProps {
  item: IGalleryItem; onClose: () => void; onLikesChanged: (id: number, n: number) => void;
  branches: ILookupOption[]; departments: ILookupOption[]; onChanged: () => void; onRemoved: () => void;
}

const GalleryLightbox: React.FC<IProps> = ({ item, onClose, onLikesChanged, branches, departments, onChanged, onRemoved }) => {
  const { reactions, user, settings } = usePortal();
  const canReact = user.isOwner || settings.allowReactions;
  const [sum, setSum] = React.useState<IReactionSummary | undefined>();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState('');

  React.useEffect(() => {
    let live = true;
    reactions.forItem(item.id).then(s => { if (live) setSum(s); }, () => { if (live) setMsg('Reactions could not be loaded.'); });
    return () => { live = false; };
  }, [item.id, reactions]);

  const react = async (k: ReactionKind): Promise<void> => {
    if (!sum || busy) return;
    setBusy(true); setMsg('');
    try {
      const n = await reactions.toggle(item.id, k, sum);
      setSum(n);
      if (k === 'Like') onLikesChanged(item.id, n.counts.Like);
    } catch { setMsg('Sorry, that did not save. Please try again.'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} label={item.title}>
      {item.isVideo
        ? <video controls playsInline preload="metadata" src={item.url} />
        : <img alt={item.title} src={item.url} />}
      <h3>{item.title}</h3>
      <p style={{ color: 'var(--t2)' }}>
        {[item.credit, item.branch, item.region, item.department, item.category].filter(Boolean).join(', ')}
      </p>
      <div className="rx" role="group" aria-label="Reactions">
        {REACTIONS.map(r => (canReact ? (
          <button key={r.kind} type="button" className="btn" disabled={!sum || busy}
            aria-pressed={!!(sum && sum.mine[r.kind])} aria-label={r.label}
            onClick={() => { react(r.kind).catch(() => undefined); }}>
            <span aria-hidden="true">{r.emoji}</span> {sum ? sum.counts[r.kind] : 0}
          </button>
        ) : (
          <span key={r.kind} className="rx-ro" aria-label={r.label + ': ' + (sum ? sum.counts[r.kind] : 0)}>
            <span aria-hidden="true">{r.emoji}</span> {sum ? sum.counts[r.kind] : 0}
          </span>
        )))}
      </div>
      <small role="status" aria-live="polite">{msg}</small>
      {user.isOwner ? <EditPhoto item={item} branches={branches} departments={departments} onChanged={onChanged} onRemoved={onRemoved} /> : null}
    </Modal>
  );
};

export default GalleryLightbox;
