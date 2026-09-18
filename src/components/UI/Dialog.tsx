'use client';
import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export function Dialog({ title, subtitle, onClose, children, wide = false }: { title: string; subtitle?: string; onClose?: () => void; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={`island-dialog ${wide ? 'dialog-wide' : ''}`} aria-labelledby={titleId} onCancel={e => { e.preventDefault(); onClose?.(); }} onClick={e => { if (e.target === e.currentTarget && onClose) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }}>
    <div className="dialog-heading"><div><span className="eyebrow">AT THE TABLE</span><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{onClose && <button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20}/></button>}</div>
    <div className="dialog-content">{children}</div>
  </dialog>;
}
