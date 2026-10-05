import * as React from 'react';
import { ILeadershipMessage } from '../models';
import { Section } from './common/Section';
import { Empty } from './common/States';

export const Voices: React.FC<{ items: ILeadershipMessage[] }> = ({ items }) => (
  <Section alt k="voices" manage={{ name: 'LeadershipMessages' }}>
    {items.length ? (
      <div className="g hg">{items.map(m => <div key={m.id} className="msg"><b>{m.title}</b><p>{m.message}</p></div>)}</div>
    ) : <Empty>No messages yet.</Empty>}
  </Section>
);
