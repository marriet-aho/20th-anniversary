import * as React from 'react';

interface IModalProps { open: boolean; onClose: () => void; label: string; children: React.ReactNode }

/** Native <dialog>: focus trap, Escape and top-layer for free. */
export const Modal: React.FC<IModalProps> = ({ open, onClose, label, children }) => {
  const ref = React.useRef<HTMLDialogElement>(null);
  React.useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    } else if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} aria-label={label} className="lbx" onClose={onClose} onCancel={onClose}
      onClick={e => { if (e.target === ref.current) onClose(); }}>
      {open ? <div className="lbx-in">{children}<p><button type="button" className="btn" onClick={onClose}>Close</button></p></div> : null}
    </dialog>
  );
};
