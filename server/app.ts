import express from "express";
import { mkdirSync } from "node:fs";
import multer from "multer";
import { openDatabase } from "./database.js";
import { createStoreImage, MAX_IMAGE_BYTES, receiveImage, UploadValidationError } from "./imageUpload.js";
import { createMediaRepository } from "./mediaRepository.js";
import { createStateRepository, isStateKey } from "./stateRepository.js";

export interface CreateAppOptions {
  databasePath: string;
  uploadsDirectory: string;
  frontendDirectory?: string;
}

export function createApp(options: CreateAppOptions) {
  mkdirSync(options.uploadsDirectory, { recursive: true });
  const database = openDatabase(options.databasePath);
  const states = createStateRepository(database);
  const media = createMediaRepository(database);
  const storeImage = createStoreImage({ uploadsDirectory: options.uploadsDirectory, media });
  const app = express();

  app.disable("x-powered-by");
  app.locals.closeDatabase = () => database.close();
  app.use(express.json({ limit: "25mb" }));
  app.use("/media", express.static(options.uploadsDirectory, { immutable: true, maxAge: "1y" }));

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.get("/api/state/:key", (request, response) => {
    if (!isStateKey(request.params.key)) {
      response.status(400).json({ error: "无效的状态类型" });
      return;
    }
    const state = states.find(request.params.key);
    if (!state) {
      response.status(404).json({ error: "状态数据不存在" });
      return;
    }
    response.json(state);
  });

  app.put("/api/state/:key", (request, response) => {
    if (!isStateKey(request.params.key)) {
      response.status(400).json({ error: "无效的状态类型" });
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(request.body ?? {}, "data")) {
      response.status(400).json({ error: "请求中缺少 data" });
      return;
    }
    response.json(states.save(request.params.key, request.body.data));
  });

  app.post("/api/uploads", receiveImage, async (request, response) => {
    if (!request.file) {
      response.status(400).json({ error: "请选择图片文件" });
      return;
    }
    const result = await storeImage(request.file);
    response.status(201).json(result);
  });

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      response.status(413).json({ error: `图片不能超过 ${MAX_IMAGE_BYTES / 1024 / 1024} MiB` });
      return;
    }
    if (error instanceof UploadValidationError) {
      response.status(error.status).json({ error: error.message });
      return;
    }
    const message = error instanceof Error ? error.message : "服务器内部错误";
    response.status(500).json({ error: message });
  });

  return app;
}
