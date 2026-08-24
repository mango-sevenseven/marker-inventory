// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Server } from "node:http";
import { createApp } from "./app.js";

describe("state API", () => {
  let tempDirectory = "";
  let server: Server;
  let baseUrl = "";
  let closeDatabase = () => {};

  beforeEach(async () => {
    tempDirectory = await mkdtemp(path.join(tmpdir(), "marker-inventory-api-"));
    const app = createApp({
      databasePath: path.join(tempDirectory, "database", "app.sqlite"),
      uploadsDirectory: path.join(tempDirectory, "uploads"),
    });
    closeDatabase = app.locals.closeDatabase;
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("测试服务器启动失败");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    closeDatabase();
    await rm(tempDirectory, { recursive: true, force: true });
  });

  it("returns 404 when an allowed state has not been saved", async () => {
    const response = await fetch(`${baseUrl}/api/state/personal-inventory`);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: "状态数据不存在" });
  });

  it("rejects state keys outside the allowlist", async () => {
    const response = await fetch(`${baseUrl}/api/state/not-allowed`);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "无效的状态类型" });
  });

  it("persists and returns a JSON snapshot", async () => {
    const data = { version: 1, items: [{ id: "item-1", name: "相机" }] };
    const saved = await fetch(`${baseUrl}/api/state/personal-inventory`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });

    expect(saved.status).toBe(200);
    await expect(saved.json()).resolves.toMatchObject({ key: "personal-inventory", data });

    const loaded = await fetch(`${baseUrl}/api/state/personal-inventory`);
    expect(loaded.status).toBe(200);
    await expect(loaded.json()).resolves.toMatchObject({ key: "personal-inventory", data });
  });

  it("stores an image on disk and serves it from the returned media URL", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const form = new FormData();
    form.append("image", new Blob([png], { type: "image/png" }), "sample.png");

    const uploaded = await fetch(`${baseUrl}/api/uploads`, { method: "POST", body: form });

    expect(uploaded.status).toBe(201);
    const result = await uploaded.json() as { id: string; url: string; mimeType: string; size: number };
    expect(result).toMatchObject({ mimeType: "image/png", size: png.byteLength });
    expect(result.url).toMatch(/^\/media\/[0-9a-f-]+\.png$/);

    const media = await fetch(`${baseUrl}${result.url}`);
    expect(media.status).toBe(200);
    expect(media.headers.get("content-type")).toContain("image/png");
    expect(new Uint8Array(await media.arrayBuffer())).toEqual(png);
  });

  it("rejects files that are not supported images", async () => {
    const form = new FormData();
    form.append("image", new Blob(["plain text"], { type: "text/plain" }), "notes.txt");

    const response = await fetch(`${baseUrl}/api/uploads`, { method: "POST", body: form });

    expect(response.status).toBe(415);
    await expect(response.json()).resolves.toMatchObject({ error: "只支持 JPG、PNG 和 WebP 图片" });
  });

  it("rejects image uploads larger than 8 MiB", async () => {
    const form = new FormData();
    form.append("image", new Blob([new Uint8Array(8 * 1024 * 1024 + 1)], { type: "image/png" }), "too-large.png");

    const response = await fetch(`${baseUrl}/api/uploads`, { method: "POST", body: form });

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ error: "图片不能超过 8 MiB" });
  });
});
