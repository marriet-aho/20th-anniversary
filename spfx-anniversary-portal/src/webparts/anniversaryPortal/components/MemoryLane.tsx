import * as React from 'react';
import { IMemory } from '../models';
import { Section } from './common/Section';
import { Empty } from './common/States';
import { Modal } from './common/Modal';

export const MemoryLane: React.FC<{ items: IMemory[] }> = ({ items }) => {
  const [open, setOpen] = React.useState<IMemory | undefined>();
  return (
    <Section alt k="memory" manage={{ name: 'MemoryLane' }}>
      {items.length ? (
        <div className="g mg">
          {items.map(m => (
            <figure key={m.id} className="tile" style={{ margin: 0 }} tabIndex={0} role="button"
              aria-label={`Open ${m.caption}`} onClick={() => setOpen(m)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(m); } }}>
              {m.photo ? <img alt="" src={m.photo} loading="lazy" /> : null}
              <figcaption>{m.caption}</figcaption>
            </figure>
          ))}
        </div>
      ) : <Empty>No memories yet.</Empty>}
      <Modal open={!!open} onClose={() => setOpen(undefined)} label="Memory">
        {open ? <>{open.photo ? <img alt={open.caption} src={open.photo} /> : null}<h3>{open.caption}</h3></> : null}
      </Modal>
    </Section>
  );
};
