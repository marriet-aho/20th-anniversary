import * as React from 'react';
import { ILegend } from '../models';
import { Section } from './common/Section';
import { Empty } from './common/States';
import { firstName, initials } from '../logic/names';

export const Avatar: React.FC<{ legend: ILegend }> = ({ legend }) => (
  <div className="avatar">{legend.photo ? <img alt="" src={legend.photo} loading="lazy" /> : initials(legend.name)}</div>
);

export function formatJoined(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const LegendPanel: React.FC<{ legend?: ILegend }> = ({ legend: s }) => (
  <aside className="panel" aria-live="polite">
    {s ? (
      <>
        <Avatar legend={s} />
        <h3>{s.name}</h3>
        <span className="badge">20 years of service</span>
        <dl>
          <dt>Position</dt><dd>{s.position}</dd>
          <dt>Department</dt><dd>{s.department}</dd>
          <dt>Branch</dt><dd>{s.branch}</dd>
          <dt>Joined</dt><dd>{formatJoined(s.joined)}</dd>
        </dl>
        {s.quote ? <p><i>&ldquo;{s.quote}&rdquo;</i></p> : null}
        {s.highlights ? <p style={{ color: 'var(--t2)' }}><b>Career highlights.</b> {s.highlights}</p> : null}
        {s.funFact ? <p style={{ color: 'var(--t2)' }}><b>Fun fact.</b> {s.funFact}</p> : null}
      </>
    ) : <p>No colleagues yet.</p>}
  </aside>
);

interface ITreeProps { legends: ILegend[]; selected: number; onSelect: (i: number) => void }

export const TreeOfLegacy: React.FC<ITreeProps> = ({ legends, selected, onSelect }) => {
  const n = legends.length, R = Math.ceil(n / 4), H = 120 + R * 95;
  const rows: React.ReactNode[] = [];
  for (let r = 0; r < R; r++) {
    const y = 100 + r * 95, c = Math.min(4, n - r * 4), half = Math.max(c - 1, 1) * 65 + 40;
    rows.push(<path key={'p' + r} d={`M${350 - half} ${y}H${350 + half}`} stroke="var(--b)" strokeWidth={6} strokeLinecap="round" />);
    for (let j = 0; j < c; j++) {
      const i = r * 4 + j, s = legends[i];
      rows.push(
        <g key={s.id} className={'node' + (i === selected ? ' on' : '')} tabIndex={0} role="button" aria-label={s.name}
          aria-pressed={i === selected} transform={`translate(${350 + (j - (c - 1) / 2) * 130} ${y})`}
          onClick={() => onSelect(i)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i); } }}>
          <circle r={24} /><text className="i">{initials(s.name)}</text><text className="nm" y={40}>{firstName(s.name)}</text>
        </g>
      );
    }
  }
  return (
    <Section id="tree" alt k="tree" manage={{ name: 'Legends' }}>
      {n ? (
        <div className="tw">
          <div>
            <svg viewBox={`0 0 700 ${H}`} role="group" aria-label="Tree of Legacy">
              <path d={`M350 60V${H - 10}`} stroke="var(--b)" strokeWidth={14} strokeLinecap="round" />
              <text x={350} y={30} textAnchor="middle" fill="var(--od)" fontWeight={600}>20 years of service</text>
              {rows}
            </svg>
          </div>
          <LegendPanel legend={legends[selected]} />
        </div>
      ) : <Empty>No legends have been added yet.</Empty>}
    </Section>
  );
};
