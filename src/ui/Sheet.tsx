import { useEffect, useId, useRef, type ReactNode } from "react";

/** A half sheet on a native modal dialog. Escape or a tap outside closes it, and focus goes back to what opened it. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => {
      dialog.close();
      opener?.focus();
    };
  }, []);

  return <dialog ref={ref} className="kg-sheet" aria-labelledby={headingId}
    onCancel={(e) => { e.preventDefault(); onClose(); }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="kg-sheet-body">
      <h2 id={headingId} className="kg-panel-title">{title}</h2>
      {children}
    </div>
  </dialog>;
}
