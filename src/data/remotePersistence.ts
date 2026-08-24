import { colorSwatchesStore } from "@/data/colorSwatchesStore";
import { lifeSystemStore } from "@/data/lifeSystemStore";
import { personalStore, type PersonalStoreSnapshot } from "@/data/personalStore";
import {
  getStoreSnapshot,
  replaceStoreSnapshot,
  subscribeDataChanges,
} from "@/data/store";

export type RemoteStateKey = "marker-inventory" | "personal-inventory" | "life-system" | "color-swatches";

export interface StateAdapter<T> {
  key: RemoteStateKey;
  getSnapshot: () => T;
  replaceSnapshot: (snapshot: T) => void;
  subscribe: (listener: () => void) => () => void;
  migrate?: (snapshot: T) => Promise<T>;
}

export interface RemoteStateClient {
  readState<T>(key: RemoteStateKey): Promise<T | null>;
  saveState<T>(key: RemoteStateKey, data: T): Promise<void>;
  uploadImage(blob: Blob, filename?: string): Promise<string>;
}

interface RemoteStateClientOptions {
  apiBase?: string;
  fetchImpl?: typeof fetch;
}

function apiPath(base: string, path: string) {
  return `${base.replace(/\/$/, "")}${path}`;
}

async function responseError(response: Response) {
  try {
    const body = await response.json() as { error?: string };
    return body.error || `请求失败 (${response.status})`;
  } catch {
    return `请求失败 (${response.status})`;
  }
}

export function createRemoteStateClient(options: RemoteStateClientOptions = {}): RemoteStateClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const base = options.apiBase ?? "";
  return {
    async readState<T>(key: RemoteStateKey) {
      const response = await fetchImpl(apiPath(base, `/api/state/${key}`), { cache: "no-store" });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(await responseError(response));
      const body = await response.json() as { data: T };
      return body.data;
    },
    async saveState<T>(key: RemoteStateKey, data: T) {
      const response = await fetchImpl(apiPath(base, `/api/state/${key}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      if (!response.ok) throw new Error(await responseError(response));
    },
    async uploadImage(blob: Blob, filename = "item-image") {
      const form = new FormData();
      form.append("image", blob, filename);
      const response = await fetchImpl(apiPath(base, "/api/uploads"), { method: "POST", body: form });
      if (!response.ok) throw new Error(await responseError(response));
      const body = await response.json() as { url: string };
      return body.url;
    },
  };
}

export function createQueuedStateWriter(client: RemoteStateClient, delayMs = 350) {
  const timers = new Map<RemoteStateKey, ReturnType<typeof setTimeout>>();
  const pending = new Map<RemoteStateKey, unknown>();

  const save = async (key: RemoteStateKey) => {
    timers.delete(key);
    const data = pending.get(key);
    pending.delete(key);
    if (data === undefined) return;
    try {
      await client.saveState(key, data);
    } catch {
      if (!pending.has(key)) pending.set(key, data);
    }
  };

  return {
    queue<T>(key: RemoteStateKey, data: T) {
      pending.set(key, data);
      const currentTimer = timers.get(key);
      if (currentTimer) clearTimeout(currentTimer);
      timers.set(key, setTimeout(() => void save(key), delayMs));
    },
    async flush() {
      const keys = [...pending.keys()];
      keys.forEach((key) => {
        const timer = timers.get(key);
        if (timer) clearTimeout(timer);
      });
      await Promise.all(keys.map(save));
    },
  };
}

export async function synchronizeStateAdapter<T>(adapter: StateAdapter<T>, client: RemoteStateClient) {
  try {
    const remote = await client.readState<T>(adapter.key);
    const source = remote ?? adapter.getSnapshot();
    const migrated = adapter.migrate ? await adapter.migrate(source) : source;
    if (remote !== null || migrated !== source) adapter.replaceSnapshot(migrated);
    if (remote === null || migrated !== source) await client.saveState(adapter.key, migrated);
    return true;
  } catch {
    return false;
  }
}

function dataUrlToBlob(dataUrl: string) {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new Error("图片数据格式无效");
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: match[1] });
}

function imageFilename(blob: Blob) {
  if (blob.type === "image/png") return "migrated-image.png";
  if (blob.type === "image/webp") return "migrated-image.webp";
  return "migrated-image.jpg";
}

export async function migratePersonalItemImages<
  T extends { items: Array<{ imageUrl?: string }> },
>(snapshot: T, upload: (dataUrl: string) => Promise<string>): Promise<T> {
  let changed = false;
  const items = await Promise.all(snapshot.items.map(async (item) => {
    if (!item.imageUrl?.startsWith("data:image/")) return item;
    try {
      const imageUrl = await upload(item.imageUrl);
      changed = true;
      return { ...item, imageUrl };
    } catch {
      return item;
    }
  }));
  return changed ? { ...snapshot, items } as T : snapshot;
}

const apiBase = import.meta.env.VITE_API_URL ?? "";
const defaultClient = createRemoteStateClient({ apiBase });
const writer = createQueuedStateWriter(defaultClient);
let initialized = false;
let unsubscribers: Array<() => void> = [];

export function queueRemoteState<T>(key: RemoteStateKey, data: T) {
  writer.queue(key, data);
}

export async function uploadDataUrl(dataUrl: string) {
  const blob = dataUrlToBlob(dataUrl);
  return defaultClient.uploadImage(blob, imageFilename(blob));
}

export async function initializeRemotePersistence() {
  if (initialized || import.meta.env.VITE_REMOTE_STORAGE === "false") return;
  initialized = true;

  const adapters: StateAdapter<unknown>[] = [
    {
      key: "marker-inventory",
      getSnapshot: getStoreSnapshot,
      replaceSnapshot: (snapshot) => replaceStoreSnapshot(snapshot as ReturnType<typeof getStoreSnapshot>),
      subscribe: subscribeDataChanges,
    },
    {
      key: "personal-inventory",
      getSnapshot: personalStore.getSnapshot,
      replaceSnapshot: (snapshot) => personalStore.replaceSnapshot(snapshot as PersonalStoreSnapshot),
      subscribe: personalStore.subscribe,
      migrate: (snapshot) => migratePersonalItemImages(snapshot as PersonalStoreSnapshot, uploadDataUrl),
    },
    {
      key: "life-system",
      getSnapshot: lifeSystemStore.getSnapshot,
      replaceSnapshot: (snapshot) => lifeSystemStore.replaceSnapshot(snapshot as ReturnType<typeof lifeSystemStore.getSnapshot>),
      subscribe: lifeSystemStore.subscribe,
    },
    {
      key: "color-swatches",
      getSnapshot: colorSwatchesStore.getSnapshot,
      replaceSnapshot: (snapshot) => colorSwatchesStore.replaceSnapshot(snapshot as ReturnType<typeof colorSwatchesStore.getSnapshot>),
      subscribe: colorSwatchesStore.subscribe,
    },
  ];

  await Promise.all(adapters.map((adapter) => synchronizeStateAdapter(adapter, defaultClient)));
  unsubscribers = adapters.map((adapter) => adapter.subscribe(() => {
    writer.queue(adapter.key, adapter.getSnapshot());
  }));
}

export async function flushRemotePersistence() {
  await writer.flush();
}

export function stopRemotePersistence() {
  unsubscribers.forEach((unsubscribe) => unsubscribe());
  unsubscribers = [];
  initialized = false;
}
