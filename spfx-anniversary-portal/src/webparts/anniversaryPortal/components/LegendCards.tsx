import * as React from 'react';
import { ILegend } from '../models';
import { Section } from './common/Section';
import { Empty } from './common/States';
import { formatJoined } from './Tree';
import { useDebounced } from '../hooks/useAsync';

const CameraIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
);

export const LegendCards: React.FC<{ legends: ILegend[]; onPick: (i: number) => void }> = ({ legends, onPick }) => {
  const [q, setQ] = React.useState('');
  const dq = useDebounced(q, 200).toLowerCase();
  const list = legends.map((l, i) => ({ l, i })).filter(x => (x.l.name + ' ' + x.l.department).toLowerCase().indexOf(dq) > -1);
  return (
    <Section k="legends" manage={{ name: 'Legends' }}>
      <input type="search" placeholder="Search by name or department" aria-label="Search colleagues" value={q}
        onChange={e => setQ(e.target.value)} />
      <div className="g cards" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
        {list.map(({ l, i }) => (
          <div key={l.id} className="card" tabIndex={0} role="button" aria-label={'View ' + l.name}
            onClick={() => onPick(i)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(i); } }}>
            <div className={'lp' + (l.photo ? ' has' : '')}>
              {l.photo ? <img alt={l.name} src={l.photo} loading="lazy" /> : <><CameraIcon /><span>Photo coming soon</span></>}
            </div>
            <b>{l.name}</b>
            <small>{l.department}</small>
            <small>Joined {formatJoined(l.joined)}</small>
            <span className="badge">20 years of service</span>
            {l.quote ? <small style={{ fontStyle: 'italic', marginTop: 'auto', paddingTop: 8 }}>&ldquo;{l.quote}&rdquo;</small> : null}
          </div>
        ))}
        {!list.length ? <Empty>{legends.length ? 'No colleagues match. Clear the search.' : 'No legends have been added yet.'}</Empty> : null}
      </div>
    </Section>
  );
};
