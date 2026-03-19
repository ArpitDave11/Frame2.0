/**
 * ToastContainer — Fixed-position container rendering toast stack.
 *
 * Bottom-left position (bottom-right reserved for chat button).
 * Reads from uiStore.toasts, renders Toast components.
 */

import { useUiStore } from '@/stores/uiStore';
import { Toast } from '@/components/shared/Toast';

export function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts);
  const removeToast = useUiStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      data-testid="toast-container"
      style={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  );
}
