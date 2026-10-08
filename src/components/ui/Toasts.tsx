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
          <div>
            <div>{x.title}</div>
            {x.body && <div className="tb">{x.body}</div>}
            {x.action && <button className="ta" onClick={() => { x.action!.onClick(); dismiss(x.id); }}>{x.action.label}</button>}
          </div>
          <button className="tx" onClick={() => dismiss(x.id)} aria-label={t('close')}><Icon name="x" size={14} /></button>
        </div>
      ))}
    </div>
  );
}
