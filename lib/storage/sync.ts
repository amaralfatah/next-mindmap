/**
 * Cross-tab notices over BroadcastChannel. When a tab saves a map, other tabs showing the same
 * map can offer to reload. Last write wins; this only tells the user it happened.
 */

export type SyncMessage =
  | { type: "saved"; mapId: string; updatedAt: number; tabId: string }
  | { type: "deleted"; mapId: string; tabId: string }
  | { type: "list-changed"; tabId: string };

const CHANNEL = "mindmap-sync";

export const tabId = Math.random().toString(36).slice(2);

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  channel ??= new BroadcastChannel(CHANNEL);
  return channel;
}

type Distribute<T> = T extends unknown ? Omit<T, "tabId"> : never;

export function broadcast(message: Distribute<SyncMessage>): void {
  try {
    getChannel()?.postMessage({ ...message, tabId });
  } catch {
    // Channel closed or unsupported; cross-tab notices are best effort.
  }
}

export function subscribe(handler: (message: SyncMessage) => void): () => void {
  const ch = getChannel();
  if (!ch) return () => {};
  const listener = (event: MessageEvent<SyncMessage>) => {
    if (event.data?.tabId !== tabId) handler(event.data);
  };
  ch.addEventListener("message", listener);
  return () => ch.removeEventListener("message", listener);
}
