import * as React from 'react';
import { ITimelineItem } from '../models';
import { Section } from './common/Section';
import { Empty } from './common/States';

export const Journey: React.FC<{ items: ITimelineItem[] }> = ({ items }) => (
  <Section id="journey" k="journey">
    {items.length ? (
      <div className="tl" role="list">
        {items.map(i => <div key={i.id} role="listitem"><h3>{i.year}</h3><p>{i.title}</p></div>)}
      </div>
    ) : <Empty>No milestones yet.</Empty>}
  </Section>
);
