import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createQueuedStateWriter,
  createDirtyStateTracker,
  createRemoteStateClient,
  migratePersonalItemImages,
  synchronizeStateAdapter,
  type RemoteStateClient,
  type StateAdapter,
} from "./remotePersistence";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("remote persistence", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("hydrates an adapter from server state when remote data exists", async () => {
    const remote = { version: 1, items: [{ id: "remote" }] };
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      key: "personal-inventory",
      data: remote,
      updatedAt: "2026-08-24T00:00:00.000Z",
    }));
    const replaceSnapshot = vi.fn();
    const adapter: StateAdapter<typeof remote> = {
      key: "personal-inventory",
      getSnapshot: () => ({ version: 1, items: [{ id: "local" }] }),
      replaceSnapshot,
      subscribe: () => () => {},
    };

    const connected = await synchronizeStateAdapter(adapter, createRemoteStateClient({ fetchImpl }));

    expect(connected).toBe(true);
    expect(replaceSnapshot).toHaveBeenCalledWith(remote);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("uploads the local snapshot when the server has no state yet", async () => {
    const local = { version: 1, items: [{ id: "local" }] };
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ error: "状态数据不存在" }, 404))
      .mockResolvedValueOnce(jsonResponse({ key: "personal-inventory", data: local }));
    const adapter: StateAdapter<typeof local> = {
      key: "personal-inventory",
      getSnapshot: () => local,
      replaceSnapshot: vi.fn(),
      subscribe: () => () => {},
    };

    const connected = await synchronizeStateAdapter(adapter, createRemoteStateClient({ fetchImpl }));

    expect(connected).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1][1]).toMatchObject({
      method: "PUT",
      body: JSON.stringify({ data: local }),
    });
  });

  it("continues with local data when the API cannot be reached", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));
    const replaceSnapshot = vi.fn();
    const adapter: StateAdapter<{ value: number }> = {
      key: "life-system",
      getSnapshot: () => ({ value: 1 }),
      replaceSnapshot,
      subscribe: () => () => {},
    };

    const connected = await synchronizeStateAdapter(adapter, createRemoteStateClient({ fetchImpl }));

    expect(connected).toBe(false);
    expect(replaceSnapshot).not.toHaveBeenCalled();
  });

  it("coalesces rapid writes and saves the latest snapshot", async () => {
    vi.useFakeTimers();
    const saveState = vi.fn<RemoteStateClient["saveState"]>().mockResolvedValue(undefined);
    const writer = createQueuedStateWriter({ saveState } as RemoteStateClient, 100);

    writer.queue("life-system", { value: 1 });
    writer.queue("life-system", { value: 2 });
    await vi.advanceTimersByTimeAsync(100);

    expect(saveState).toHaveBeenCalledTimes(1);
    expect(saveState).toHaveBeenCalledWith("life-system", { value: 2 });
  });

  it("retries a queued snapshot after a temporary save failure", async () => {
    vi.useFakeTimers();
    const saveState = vi.fn<RemoteStateClient["saveState"]>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(undefined);
    const writer = createQueuedStateWriter({ saveState } as RemoteStateClient, 100, { retryDelayMs: 200 });

    writer.queue("marker-inventory", { value: 1 });
    await vi.advanceTimersByTimeAsync(100);
    expect(saveState).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(200);
    expect(saveState).toHaveBeenCalledTimes(2);
  });

  it("serializes writes for the same key so an older response cannot overwrite newer data", async () => {
    vi.useFakeTimers();
    let finishFirst: (() => void) | undefined;
    const firstSave = new Promise<void>((resolve) => { finishFirst = resolve; });
    const saveState = vi.fn<RemoteStateClient["saveState"]>()
      .mockReturnValueOnce(firstSave)
      .mockResolvedValue(undefined);
    const writer = createQueuedStateWriter({ saveState } as RemoteStateClient, 100);

    writer.queue("personal-inventory", { value: 1 });
    await vi.advanceTimersByTimeAsync(100);
    writer.queue("personal-inventory", { value: 2 });
    await vi.advanceTimersByTimeAsync(100);

    expect(saveState).toHaveBeenCalledTimes(1);
    finishFirst?.();
    await vi.runAllTimersAsync();
    expect(saveState).toHaveBeenCalledTimes(2);
    expect(saveState).toHaveBeenLastCalledWith("personal-inventory", { value: 2 });
  });

  it("prefers a locally dirty snapshot over older server data", async () => {
    const local = { value: "local-unsynced" };
    const remote = { value: "remote-old" };
    const replaceSnapshot = vi.fn();
    const saveState = vi.fn().mockResolvedValue(undefined);
    const adapter: StateAdapter<typeof local> = {
      key: "life-system",
      getSnapshot: () => local,
      replaceSnapshot,
      subscribe: () => () => {},
      preferLocal: true,
    };
    const client = {
      readState: vi.fn().mockResolvedValue(remote),
      saveState,
    } as unknown as RemoteStateClient;

    const connected = await synchronizeStateAdapter(adapter, client);

    expect(connected).toBe(true);
    expect(replaceSnapshot).not.toHaveBeenCalled();
    expect(saveState).toHaveBeenCalledWith("life-system", local);
  });

  it("tracks unsynced state keys in browser storage", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const tracker = createDirtyStateTracker(storage);

    tracker.mark("personal-inventory");
    expect(tracker.has("personal-inventory")).toBe(true);
    tracker.clear("personal-inventory");
    expect(tracker.has("personal-inventory")).toBe(false);
  });

  it("adds an abort signal to API requests so startup cannot hang forever", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ error: "状态数据不存在" }, 404));
    const client = createRemoteStateClient({ fetchImpl, requestTimeoutMs: 50 });

    await client.readState("life-system");

    expect(fetchImpl.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("replaces Base64 item images with uploaded media URLs", async () => {
    const snapshot = {
      version: 1 as const,
      items: [
        { id: "with-image", imageUrl: "data:image/png;base64,iVBORw0KGgo=" },
        { id: "without-image", imageUrl: "" },
      ],
    };
    const upload = vi.fn().mockResolvedValue("/media/photo.png");

    const migrated = await migratePersonalItemImages(snapshot, upload);

    expect(upload).toHaveBeenCalledOnce();
    expect(migrated.items[0].imageUrl).toBe("/media/photo.png");
    expect(migrated.items[1].imageUrl).toBe("");
  });
});
