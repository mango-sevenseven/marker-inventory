import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createQueuedStateWriter,
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
