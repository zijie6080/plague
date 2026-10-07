import { useI18n } from '../../i18n';
import { dismiss, useToasts } from '../../lib/toast';
import { Icon } from './Icon';

export function Toasts() {
  const toasts = useToasts();
  const { t } = useI18n();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((x) => (
        <div className="toast" key={x.id} data-tone={x.tone || 'info'}>
          <span className="ti" />
          <div>
            <div style={{ fontWeight: 600 }}>{x.title}</div>
            {x.body && <div className="tb">{x.body}</div>}
            {x.action && (
              <button className="btn-link ta" onClick={() => { x.action!.onClick(); dismiss(x.id); }}>{x.action.label}<Icon name="chevronRight" size={13} /></button>
            )}
          </div>
          <button className="iconbtn tx" style={{ width: 24, height: 24 }} onClick={() => dismiss(x.id)} aria-label={t('close')}><Icon name="x" size={14} /></button>
        </div>
      ))}
    </div>
  );
}
