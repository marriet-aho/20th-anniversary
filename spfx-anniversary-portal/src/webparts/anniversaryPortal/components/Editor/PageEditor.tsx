import * as React from 'react';
import {
  IContentMap, IKeyStat, ILeadershipMessage, ILegend, IMemory, IPortalSettings, ITimelineItem, PortalAssets
} from '../../models';
import { EditService, MEDIA_SLOTS } from '../../services/EditService';
import { PortalService } from '../../services/PortalService';
import { DEFAULT_COUNTDOWN, DEFAULT_TEXT } from '../defaults';
import { Modal } from '../common/Modal';
import { IField, IRow, RowsTab } from './RowsTab';

interface IProps {
  edit: EditService; portal: PortalService; settings: IPortalSettings; content: IContentMap; assets: PortalAssets;
  timeline: ITimelineItem[]; stats: IKeyStat[]; legends: ILegend[]; memory: IMemory[]; voices: ILeadershipMessage[];
  onChanged: () => void;
}

type Tab = 'text' | 'stats' | 'timeline' | 'legends' | 'memory' | 'voices' | 'media';
const TABS: { id: Tab; label: string }[] = [
  { id: 'text', label: 'Words and dates' }, { id: 'stats', label: 'Key figures' }, { id: 'timeline', label: 'Timeline' },
  { id: 'legends', label: 'Legends' }, { id: 'memory', label: 'Memory Lane' }, { id: 'voices', label: 'Leadership messages' },
  { id: 'media', label: 'Logo, video and music' }
];

const SECTION_NAMES: { [k: string]: string } = {
  hero: 'Top of the page', countdown: 'Countdown', journey: 'Timeline', tree: 'Tree of Legacy', legends: 'Legend cards',
  memory: 'Memory Lane', voices: 'Voices of appreciation', video: 'Anniversary video', board: 'Celebration board',
  gallery: 'Celebration Gallery', footer: 'Bottom of the page'
};
const PART_NAMES: { [k: string]: string } = { title: 'Title', subtitle: 'Subtitle', heading: 'Heading', sub: 'Line under the heading', lead: 'Intro line', btn1: 'Button 1', btn2: 'Button 2', btn3: 'Button 3' };

const toLocalInput = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n: number): string => (n < 10 ? '0' : '') + n;
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
};

const TextRow: React.FC<{ k: string; value: string; onSave: (v: string) => Promise<void> }> = ({ k, value, onSave }) => {
  const [v, setV] = React.useState(value);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  React.useEffect(() => { setV(value); }, [value]);
  const [sec, part] = k.split('.');
  const long = value.length > 70 || /sub|lead/.test(part);
  const go = async (): Promise<void> => {
    setBusy(true); setMsg('');
    try { await onSave(v); setMsg('Saved.'); } catch (e) { setMsg('Sorry, that did not save' + (e instanceof Error ? ': ' + e.message : '.')); } finally { setBusy(false); }
  };
  return (
    <div className="ed-card">
      <label>{(SECTION_NAMES[sec] || sec) + ': ' + (PART_NAMES[part] || part)}
        {long ? <textarea rows={2} value={v} onChange={e => setV(e.target.value)} /> : <input type="text" value={v} onChange={e => setV(e.target.value)} />}
      </label>
      <div className="oc-acts"><button type="button" className="btn" disabled={busy || v === value} onClick={() => { go().catch(() => undefined); }}>Save</button></div>
      <small role="status" aria-live="polite">{msg}</small>
    </div>
  );
};

interface IHandlers {
  onSave: (id: number, v: { [k: string]: string }, file: File | undefined) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const nextOrder = (xs: { sortOrder: number }[]): number => xs.reduce((m, x) => Math.max(m, x.sortOrder || 0), 0) + 1;
const str = (n: number | string | undefined): string => (n === undefined || n === null ? '' : String(n));
const num = (s: string, d = 0): number => (isFinite(parseFloat(s)) ? parseFloat(s) : d);

/** Owners only: a button that opens one panel to edit everything on the page. */
export const PageEditor: React.FC<IProps> = p => {
  const { edit, settings } = p;
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<Tab>('text');
  const [mediaMsg, setMediaMsg] = React.useState<{ [type: string]: string }>({});
  const [countdownMsg, setCountdownMsg] = React.useState('');
  const [date, setDate] = React.useState(toLocalInput((p.content['countdown.date'] && p.content['countdown.date'].date) || DEFAULT_COUNTDOWN));
  const done = p.onChanged;
  const lookups = React.useRef<{ departments: { id: number; title: string }[]; branches: { id: number; title: string }[] }>({ departments: [], branches: [] });
  React.useEffect(() => {
    if (!open) return;
    Promise.all([p.portal.getLookup('departments'), p.portal.getLookup('branches')])
      .then(([d, b]) => { lookups.current = { departments: d, branches: b }; }, () => undefined);
  }, [open, p.portal]);

  const textKeys = Object.keys(DEFAULT_TEXT).filter(k => k !== 'video.sub');
  const rowsOf = <T extends { id: number }>(xs: T[], map: (x: T) => { [k: string]: string }, photo?: (x: T) => string): IRow[] =>
    xs.map(x => ({ id: x.id, values: map(x), photo: photo ? photo(x) : undefined }));

  const crud = (listName: string, build: (v: { [k: string]: string }) => { [k: string]: unknown }, extraOnAdd?: { [k: string]: unknown }): IHandlers => ({
    onSave: async (id: number, v: { [k: string]: string }): Promise<void> => {
      if (id) await edit.updateRow(listName, id, build(v)); else await edit.addRow(listName, { ...build(v), ...(extraOnAdd || {}) });
      done();
    },
    onDelete: async (id: number): Promise<void> => { await edit.removeRow(listName, id); done(); }
  });

  const photoCrud = (listName: string, build: (v: { [k: string]: string }) => { [k: string]: unknown }, titleOf: (v: { [k: string]: string }) => string, extra?: { [k: string]: unknown }): IHandlers => ({
    onSave: async (id: number, v: { [k: string]: string }, file: File | undefined): Promise<void> => {
      const rid = id || await edit.addRow(listName, { ...build(v), ...(extra || {}) });
      if (id) await edit.updateRow(listName, id, build(v));
      if (file) await edit.setPhoto(listName, rid, file, titleOf(v));
      done();
    },
    onDelete: async (id: number): Promise<void> => { await edit.removeRow(listName, id); done(); }
  });

  const legendFields: IField[] = [
    { key: 'name', label: 'Name', kind: 'text' }, { key: 'position', label: 'Position', kind: 'text' },
    { key: 'department', label: 'Department', kind: 'text' }, { key: 'branch', label: 'Branch', kind: 'text' },
    { key: 'sortOrder', label: 'Order in the tree (1, 2, 3...)', kind: 'number' }
  ];

  const saveDate = async (): Promise<void> => {
    setCountdownMsg('');
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) { setCountdownMsg('Please pick a valid date and time.'); return; }
      await edit.saveText('countdown.date', '', d.toISOString()); setCountdownMsg('Saved.'); done();
    } catch (e) { setCountdownMsg('Sorry, that did not save' + (e instanceof Error ? ': ' + e.message : '.')); }
  };

  const replace = async (type: typeof MEDIA_SLOTS[number]['type'], label: string, file: File | undefined): Promise<void> => {
    if (!file) return;
    setMediaMsg(m => ({ ...m, [type]: 'Uploading ' + file.name + '…' }));
    try { await edit.replaceMedia(type, label, file); setMediaMsg(m => ({ ...m, [type]: 'Replaced. The page now uses the new file.' })); done(); }
    catch (e) { setMediaMsg(m => ({ ...m, [type]: 'Sorry, that did not upload' + (e instanceof Error ? ': ' + e.message : '.') })); }
  };

  return (
    <>
      <button type="button" className="ed-fab" onClick={() => setOpen(true)}>{'✎'} Edit page</button>
      <Modal open={open} onClose={() => setOpen(false)} label="Edit the page">
        <h3>Edit the page <span className="ow-tag">Only owners see this</span></h3>
        <div className="gb ed-tabs" role="tablist" aria-label="What to edit">
          {TABS.map(t => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>
        {tab === 'text' ? (
          <div>
            <p className="ow-help">Change any wording. Use {'{count}'} where the number of legends should appear. Save each one after you edit it.</p>
            <div className="ed-card">
              <label>Countdown: the date and time of the celebration
                <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
              </label>
              <div className="oc-acts"><button type="button" className="btn" onClick={() => { saveDate().catch(() => undefined); }}>Save date</button></div>
              <small role="status" aria-live="polite">{countdownMsg}</small>
            </div>
            {textKeys.map(k => (
              <TextRow key={k} k={k} value={p.content[k] && p.content[k].value ? p.content[k].value : DEFAULT_TEXT[k]}
                onSave={async v => { await edit.saveText(k, v); done(); }} />
            ))}
          </div>
        ) : null}
        {tab === 'stats' ? (
          <RowsTab addLabel="Add a key figure (the numbers at the top), or change one below." orderKey="sortOrder" nextOrder={nextOrder(p.stats)}
            fields={[{ key: 'label', label: 'Label (for example Branches Nationwide)', kind: 'text' }, { key: 'value', label: 'Value (for example 81 or 2k+)', kind: 'text' }, { key: 'sortOrder', label: 'Order', kind: 'number' }]}
            rows={rowsOf(p.stats, s => ({ label: s.label, value: s.value, sortOrder: str(s.sortOrder) }))}
            describe={v => (v.label || '') + ': ' + (v.value || '')}
            {...crud(settings.keyStatsList, v => ({ Title: v.label || '', Value: v.value || '', SortOrder: num(v.sortOrder) }))} />
        ) : null}
        {tab === 'timeline' ? (
          <RowsTab addLabel="Add a milestone, or change one below." orderKey="sortOrder" nextOrder={nextOrder(p.timeline)}
            fields={[{ key: 'year', label: 'Year', kind: 'number' }, { key: 'title', label: 'What happened', kind: 'long', wide: true }, { key: 'sortOrder', label: 'Order', kind: 'number' }]}
            rows={rowsOf(p.timeline, t => ({ year: str(t.year), title: t.title, sortOrder: str(t.sortOrder) }))}
            describe={v => (v.year || '') + ' ' + (v.title || '').slice(0, 50)}
            {...crud(settings.timelineList, v => ({ Title: v.title || '', Year: num(v.year), SortOrder: num(v.sortOrder) }))} />
        ) : null}
        {tab === 'legends' ? (
          <RowsTab addLabel="Add a legend, change one, or choose a new picture. Picture, name, position, department and branch show on the page." orderKey="sortOrder" nextOrder={nextOrder(p.legends)} withPhoto
            fields={legendFields}
            rows={rowsOf(p.legends, l => ({ name: l.name, position: l.position, department: l.department, branch: l.branch, sortOrder: str(l.sortOrder) }), l => l.photo)}
            describe={v => v.name || ''}
            onSave={async (id, v, file) => {
              const rid = await edit.saveLegend(id, { name: v.name || '', position: v.position || '', department: v.department || '', branch: v.branch || '', sortOrder: num(v.sortOrder) }, lookups.current);
              if (file) await edit.setPhoto(settings.legendsList, rid, file, v.name || 'Legend');
              done();
            }}
            onDelete={async id => { await edit.removeRow(settings.legendsList, id); done(); }} />
        ) : null}
        {tab === 'memory' ? (
          <RowsTab addLabel="Add a Memory Lane picture, change a caption, or choose a new picture." orderKey="sortOrder" nextOrder={nextOrder(p.memory)} withPhoto
            fields={[{ key: 'caption', label: 'Caption', kind: 'text' }, { key: 'sortOrder', label: 'Order', kind: 'number' }]}
            rows={rowsOf(p.memory, m => ({ caption: m.caption, sortOrder: str(m.sortOrder) }), m => m.photo)}
            describe={v => v.caption || ''}
            {...photoCrud(settings.memoryList, v => ({ Title: v.caption || '', SortOrder: num(v.sortOrder) }), v => v.caption || 'Memory')} />
        ) : null}
        {tab === 'voices' ? (
          <RowsTab addLabel="Add or change a message in Voices of appreciation." orderKey="sortOrder" nextOrder={nextOrder(p.voices)}
            fields={[{ key: 'title', label: 'Who it is from (for example Message from the CEO)', kind: 'text' }, { key: 'message', label: 'Message', kind: 'long', wide: true }, { key: 'sortOrder', label: 'Order', kind: 'number' }]}
            rows={rowsOf(p.voices, m => ({ title: m.title, message: m.message, sortOrder: str(m.sortOrder) }))}
            describe={v => v.title || ''}
            {...crud(settings.messagesList, v => ({ Title: v.title || '', Message: v.message || '', SortOrder: num(v.sortOrder) }))} />
        ) : null}
        {tab === 'media' ? (
          <div>
            <p className="ow-help">Choose a new file to replace the current one. The newest file you upload is the one the page uses. Videos can take a minute to upload.</p>
            {MEDIA_SLOTS.map(s => {
              const cur = p.assets[s.type];
              return (
                <div className="ed-card" key={s.type}>
                  <label>{s.label}
                    <span className="ow-help">{cur ? 'Current file: ' + decodeURIComponent(cur.split('/').pop() || '') : 'Nothing uploaded yet'}</span>
                    <input type="file" accept={s.accept} onChange={e => { replace(s.type, s.label, (e.target.files && e.target.files[0]) || undefined).catch(() => undefined); e.target.value = ''; }} />
                  </label>
                  <small role="status" aria-live="polite">{mediaMsg[s.type] || ''}</small>
                </div>
              );
            })}
          </div>
        ) : null}
      </Modal>
    </>
  );
};
