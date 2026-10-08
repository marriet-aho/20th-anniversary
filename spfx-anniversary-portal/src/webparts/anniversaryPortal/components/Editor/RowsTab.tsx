import * as React from 'react';

export interface IField { key: string; label: string; kind: 'text' | 'number' | 'long'; wide?: boolean }
export interface IRow { id: number; values: { [key: string]: string }; photo?: string }

interface IProps {
  fields: IField[]; rows: IRow[]; withPhoto?: boolean; addLabel: string; nextOrder: number; orderKey: string;
  onSave: (id: number, values: { [key: string]: string }, photo: File | undefined) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  describe: (values: { [key: string]: string }) => string;
}

const Card: React.FC<{ row: IRow; isNew?: boolean } & Omit<IProps, 'rows' | 'addLabel' | 'nextOrder'>> = ({ row, isNew, fields, withPhoto, onSave, onDelete, describe }) => {
  const [v, setV] = React.useState(row.values);
  const [file, setFile] = React.useState<File | undefined>();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const [sure, setSure] = React.useState(false);
  const input = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { setV(row.values); }, [row.values]);

  const save = async (): Promise<void> => {
    setBusy(true); setMsg('');
    try {
      await onSave(row.id, v, file);
      setFile(undefined); if (input.current) input.current.value = '';
      if (isNew) setV(row.values);
      setMsg(isNew ? 'Added.' : 'Saved.');
    } catch (e) { setMsg('Sorry, that did not save' + (e instanceof Error ? ': ' + e.message : '.')); } finally { setBusy(false); }
  };
  const remove = async (): Promise<void> => {
    setBusy(true); setMsg('');
    try { await onDelete(row.id); } catch (e) { setMsg('Sorry, that did not delete' + (e instanceof Error ? ': ' + e.message : '.')); setBusy(false); }
  };

  return (
    <div className={'ed-card' + (isNew ? ' ed-new' : '')}>
      {!isNew ? <b className="ed-h">{describe(row.values) || 'Untitled'}</b> : null}
      <div className="ow-grid">
        {fields.map(f => (
          <label key={f.key} className={f.wide ? 'ed-wide' : undefined}>{f.label}
            {f.kind === 'long'
              ? <textarea rows={3} value={v[f.key] || ''} onChange={e => setV({ ...v, [f.key]: e.target.value })} />
              : <input type={f.kind === 'number' ? 'number' : 'text'} value={v[f.key] || ''} onChange={e => setV({ ...v, [f.key]: e.target.value })} />}
          </label>
        ))}
        {withPhoto ? (
          <label className="ed-wide">Picture {row.photo ? <img className="ed-thumb" alt="" src={row.photo} /> : null}
            <input ref={input} type="file" accept="image/*" onChange={e => setFile((e.target.files && e.target.files[0]) || undefined)} />
          </label>
        ) : null}
      </div>
      <div className="oc-acts">
        <button type="button" className="btn" disabled={busy} onClick={() => { save().catch(() => undefined); }}>{isNew ? 'Add' : 'Save'}</button>
        {!isNew ? (sure
          ? <button type="button" className="btn oc-del" disabled={busy} onClick={() => { remove().catch(() => undefined); }}>Yes, delete</button>
          : <button type="button" className="btn oc-del" disabled={busy} onClick={() => setSure(true)}>Delete</button>) : null}
      </div>
      <small role="status" aria-live="polite">{msg}</small>
    </div>
  );
};

/** A list of editable rows, plus an "add new" card on top. */
export const RowsTab: React.FC<IProps> = props => {
  const blank: IRow = React.useMemo(() => ({ id: 0, values: { [props.orderKey]: String(props.nextOrder) } }), [props.orderKey, props.nextOrder]);
  return (
    <div>
      <p className="ow-help">{props.addLabel}</p>
      <Card row={blank} isNew fields={props.fields} withPhoto={props.withPhoto} orderKey={props.orderKey} onSave={props.onSave} onDelete={props.onDelete} describe={props.describe} />
      {props.rows.map(r => <Card key={r.id} row={r} fields={props.fields} withPhoto={props.withPhoto} orderKey={props.orderKey} onSave={props.onSave} onDelete={props.onDelete} describe={props.describe} />)}
    </div>
  );
};
