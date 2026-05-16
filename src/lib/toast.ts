// Lightweight singleton toast store — no external deps

export type ToastKind = 'success' | 'error' | 'info';

export type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
};

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l([...toasts]));
}

function add(kind: ToastKind, message: string) {
  const id = Math.random().toString(36).slice(2);
  toasts = [{ id, kind, message }, ...toasts].slice(0, 3); // max 3 visible
  notify();
  setTimeout(() => remove(id), 4000);
}

function remove(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

export const toast = {
  success: (msg: string) => add('success', msg),
  error: (msg: string) => add('error', msg),
  info: (msg: string) => add('info', msg),
};

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener([...toasts]);
  return () => listeners.delete(listener);
}

export { remove as dismissToast };
