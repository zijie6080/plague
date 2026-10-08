import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../i18n';
import { Icon } from './Icon';

/** Side panel on desktop, bottom sheet on mobile (swipe down to close). */
export function Sheet({ open, onClose, eyebrow, title, children }: { open: boolean; onClose: () => void; eyebrow?: ReactNode; title: ReactNode; children: ReactNode }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; prevFocus?.focus?.(); };
  }, [open, onClose]);

  if (!open) return null;
  const onTouchStart = (e: React.TouchEvent) => {
    if ((ref.current?.querySelector('.sheet-body')?.scrollTop || 0) > 0) return;
    drag.current = { y: e.touches[0].clientY, dy: 0 };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.current || !ref.current) return;
    drag.current.dy = Math.max(0, e.touches[0].clientY - drag.current.y);
    ref.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onTouchEnd = () => {
    if (!drag.current || !ref.current) return;
    const el = ref.current;
    const close = drag.current.dy > 90;
    el.style.transition = 'transform .2s ease';
    el.style.transform = close ? 'translateY(100%)' : '';
    setTimeout(() => { el.style.transition = ''; if (close) onClose(); }, 200);
    drag.current = null;
  };
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" tabIndex={-1} ref={ref} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div className="sheet-grab" />
        <div className="sheet-head">
          <div style={{ minWidth: 0 }}>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h3>{title}</h3></div>
          <button className="close" onClick={onClose} aria-label={t('close')}><Icon name="x" size={18} /></button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>,
    document.body,
  );
}
