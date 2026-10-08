import * as React from 'react';
import { IGalleryItem, ILookupOption } from '../../models';
import { usePortal } from '../PortalContext';
import { GALLERY_CATEGORIES, IPhotoDetails } from '../../services/GalleryService';

interface IFieldsProps {
  value: IPhotoDetails; onChange: (v: IPhotoDetails) => void; captionLabel: string; captionHint?: string;
  branches: ILookupOption[]; departments: ILookupOption[]; idPrefix: string;
}

/** The five details an owner can set on a photo. */
const DetailFields: React.FC<IFieldsProps> = ({ value, onChange, captionLabel, captionHint, branches, departments, idPrefix }) => {
  const set = (p: Partial<IPhotoDetails>): void => onChange({ ...value, ...p });
  const regions = Array.from(new Set(branches.map(b => b.region || '').filter(Boolean)));
  return (
    <div className="ow-grid">
      <label>{captionLabel}
        <input type="text" maxLength={250} value={value.title} placeholder={captionHint} onChange={e => set({ title: e.target.value })} />
      </label>
      <label>Category
        <select className="inp" value={value.category} onChange={e => set({ category: e.target.value })}>
          {GALLERY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label>Branch
        <input type="text" list={idPrefix + '-br'} maxLength={120} value={value.branch} placeholder="Type the branch" onChange={e => set({ branch: e.target.value })} />
        <datalist id={idPrefix + '-br'}>{branches.map(b => <option key={b.id} value={b.title} />)}</datalist>
      </label>
      <label>Region
        <input type="text" list={idPrefix + '-rg'} maxLength={120} value={value.region} placeholder="Type the region" onChange={e => set({ region: e.target.value })} />
        <datalist id={idPrefix + '-rg'}>{regions.map(r => <option key={r} value={r} />)}</datalist>
      </label>
      <label>Department
        <select className="inp" value={value.departmentId ? String(value.departmentId) : ''} onChange={e => set({ departmentId: e.target.value ? +e.target.value : undefined })}>
          <option value="">None</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
      </label>
    </div>
  );
};

const EMPTY: IPhotoDetails = { title: '', category: GALLERY_CATEGORIES[0], branch: '', region: '' };
const baseName = (n: string): string => n.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();

interface IAddProps { branches: ILookupOption[]; departments: ILookupOption[]; onDone: () => void }

/** Owners only: upload one or more photos or videos straight from the page. */
export const AddPhotos: React.FC<IAddProps> = ({ branches, departments, onDone }) => {
  const { gallery } = usePortal();
  const [open, setOpen] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);
  const [d, setD] = React.useState<IPhotoDetails>(EMPTY);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const input = React.useRef<HTMLInputElement>(null);

  const go = async (): Promise<void> => {
    if (!files.length || busy) return;
    setBusy(true);
    let ok = 0;
    const failed: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setMsg('Uploading ' + (i + 1) + ' of ' + files.length + ': ' + files[i].name + '…');
      try {
        await gallery.upload(files[i], { ...d, title: d.title.trim() && files.length === 1 ? d.title : (d.title.trim() ? d.title.trim() + ' ' + (i + 1) : baseName(files[i].name)) });
        ok++;
      } catch (e) { failed.push(files[i].name + (e instanceof Error ? ' (' + e.message + ')' : '')); }
    }
    setBusy(false);
    setMsg((ok ? ok + (ok === 1 ? ' photo added. ' : ' photos added. ') : '') + (failed.length ? 'Not uploaded: ' + failed.join('; ') : ''));
    if (ok) { setFiles([]); if (input.current) input.current.value = ''; onDone(); }
  };

  return (
    <div className="ow">
      <button type="button" className="btn" aria-expanded={open} aria-controls="ow-add" onClick={() => setOpen(o => !o)}>
        {open ? 'Close' : '+ Add photos'}
      </button>
      <span className="ow-tag">Only owners see this</span>
      <div id="ow-add" hidden={!open}>
        <p className="ow-help">Choose one or many photos or videos. The details below are applied to all of them; leave the caption empty to use each file&apos;s name.</p>
        <label className="ow-file">Photos or videos
          <input ref={input} type="file" multiple accept="image/*,video/*" onChange={e => setFiles(Array.prototype.slice.call(e.target.files || []) as File[])} />
        </label>
        <DetailFields value={d} onChange={setD} captionLabel="Caption (optional)" captionHint="Use the file name" branches={branches} departments={departments} idPrefix="ow-add" />
        <p><button type="button" className="btn" disabled={busy || !files.length} onClick={() => { go().catch(() => undefined); }}>
          {busy ? 'Uploading…' : 'Upload' + (files.length ? ' ' + files.length + (files.length === 1 ? ' file' : ' files') : '')}
        </button></p>
        <small role="status" aria-live="polite">{msg}</small>
      </div>
    </div>
  );
};

interface IEditProps { item: IGalleryItem; branches: ILookupOption[]; departments: ILookupOption[]; onChanged: () => void; onRemoved: () => void }

/** Owners only: edit, hide or delete the photo that is open. */
export const EditPhoto: React.FC<IEditProps> = ({ item, branches, departments, onChanged, onRemoved }) => {
  const { gallery } = usePortal();
  const [d, setD] = React.useState<IPhotoDetails>({ title: item.title, category: item.category || GALLERY_CATEGORIES[0], branch: item.branch, region: item.region, departmentId: item.departmentId });
  const [published, setPublished] = React.useState(item.published);
  const [sure, setSure] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState('');

  const run = async (what: () => Promise<void>, ok: string): Promise<void> => {
    setBusy(true); setMsg('');
    try { await what(); setMsg(ok); } catch (e) { setMsg('Sorry, that did not save' + (e instanceof Error ? ': ' + e.message : '.')); } finally { setBusy(false); }
  };

  return (
    <div className="ow ow-edit">
      <h4>Edit this photo <span className="ow-tag">Only owners see this</span></h4>
      <DetailFields value={d} onChange={setD} captionLabel="Caption" branches={branches} departments={departments} idPrefix={'ow-ed' + item.id} />
      <div className="oc-acts">
        <button type="button" className="btn" disabled={busy} onClick={() => { run(async () => { await gallery.updateDetails(item.id, d); onChanged(); }, 'Saved.').catch(() => undefined); }}>Save changes</button>
        <button type="button" className="btn" disabled={busy} onClick={() => { run(async () => { await gallery.setPublished(item.id, !published); setPublished(!published); onChanged(); }, published ? 'Hidden from visitors.' : 'Visible to visitors again.').catch(() => undefined); }}>
          {published ? 'Hide from visitors' : 'Show to visitors'}
        </button>
        {sure
          ? <button type="button" className="btn oc-del" disabled={busy} onClick={() => { run(async () => { await gallery.remove(item.id); onRemoved(); }, 'Deleted.').catch(() => undefined); }}>Yes, delete this photo</button>
          : <button type="button" className="btn oc-del" disabled={busy} onClick={() => setSure(true)}>Delete photo</button>}
      </div>
      <small role="status" aria-live="polite">{msg}</small>
    </div>
  );
};
