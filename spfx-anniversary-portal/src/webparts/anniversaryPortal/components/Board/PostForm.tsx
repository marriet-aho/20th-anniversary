import * as React from 'react';
import { ILegend, TagKey } from '../../models';
import { detectTags, resolveTags, TAGS } from '../../logic/tagSuggest';
import { MAX_MESSAGE } from '../../services/BoardService';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface IProps { legends: ILegend[]; onPost: (text: string, celebratingId: number | undefined, tags: TagKey[]) => Promise<void> }

export const PostForm: React.FC<IProps> = ({ legends, onPost }) => {
  const rm = useReducedMotion();
  const [text, setText] = React.useState('');
  const [to, setTo] = React.useState('');
  const [tags, setTags] = React.useState<TagKey[]>([]);
  const [manual, setManual] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const btn = React.useRef<HTMLButtonElement>(null);

  const change = (v: string): void => {
    setText(v);
    if (!manual) setTags(detectTags(v)); // auto-suggest until the person picks tags themselves
  };
  const toggle = (k: TagKey): void => {
    setManual(true);
    setTags(t => (t.indexOf(k) > -1 ? t.filter(x => x !== k) : t.concat(k)));
  };
  const post = async (): Promise<void> => {
    if (!text.trim()) { setMsg('Write a message first.'); return; }
    setBusy(true); setMsg('');
    try {
      await onPost(text, to ? +to : undefined, resolveTags(text, manual ? tags : []));
      setText(''); setTo(''); setTags([]); setManual(false);
      setMsg('Thank you! Your message is on the board.');
      if (!rm && btn.current) { const el = btn.current; import(/* webpackChunkName: 'confetti' */ './confetti').then(m => m.burst(el)).catch(() => undefined); }
    } catch {
      setMsg('Sorry, your message could not be posted. Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="oc-form">
      <div className="oc-fr">
        <select className="inp" aria-label="Legend you are celebrating" value={to} onChange={e => setTo(e.target.value)}>
          <option value="">Celebrating our whole Orange Family</option>
          {legends.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      <textarea rows={3} maxLength={MAX_MESSAGE} placeholder="Write your message here" aria-label="Your message" value={text}
        onChange={e => change(e.target.value)} />
      <small>{text.length}/{MAX_MESSAGE}</small>
      <div className="oc-tags" role="group" aria-label="Appreciation tags">
        {TAGS.map(t => (
          <button key={t.key} type="button" aria-pressed={tags.indexOf(t.key) > -1} onClick={() => toggle(t.key)}>{t.emoji} {t.key}</button>
        ))}
      </div>
      <div>
        <button type="button" className="btn" ref={btn} disabled={busy} onClick={post}>Post to the board</button>{' '}
        <small>Tags are suggested as you type. Tap to choose your own.</small>
      </div>
      <small role="status" aria-live="polite">{msg}</small>
    </div>
  );
};
