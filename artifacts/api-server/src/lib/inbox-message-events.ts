type UnreadCountListener = () => void;

const listenersByRunnerId = new Map<number, Set<UnreadCountListener>>();

export function subscribeToUnreadCountUpdates(
  runnerId: number,
  listener: UnreadCountListener,
): () => void {
  let listeners = listenersByRunnerId.get(runnerId);
  if (!listeners) {
    listeners = new Set();
    listenersByRunnerId.set(runnerId, listeners);
  }

  listeners.add(listener);

  return () => {
    listeners?.delete(listener);
    if (listeners?.size === 0) {
      listenersByRunnerId.delete(runnerId);
    }
  };
}

export function publishUnreadCountUpdate(runnerId: number): void {
  for (const listener of listenersByRunnerId.get(runnerId) ?? []) {
    listener();
  }
}
