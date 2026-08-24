# NAS Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a NAS-ready Node/SQLite persistence API, file-based image storage, automatic browser-data migration, and Docker/Nginx deployment without adding authentication.

**Architecture:** Keep the existing synchronous frontend stores and local cache, then add a boot-time remote hydration layer plus debounced snapshot writes. Run a TypeScript Express API beside an Nginx static frontend; persist state JSON in SQLite and image bytes in a mounted uploads directory.

**Tech Stack:** React 18, TypeScript 5.7, Vite 6, Express, better-sqlite3, Multer, Vitest, Docker Compose, Nginx.

## Global Constraints

- Preserve all current pages and synchronous store APIs.
- Expose only Nginx to the NAS network; do not publish the API container port.
- Do not add login, users, sessions, cookies, or CORS.
- Store JPEG, PNG, and WebP bytes under the uploads volume; store only URLs and metadata in SQLite.
- Migrate existing local snapshots and Base64 item images automatically.

---

### Task 1: SQLite state repository and HTTP API

**Files:**
- Create: `server/config.ts`, `server/database.ts`, `server/stateRepository.ts`, `server/app.ts`, `server/index.ts`, `server/tsconfig.json`
- Create test: `server/app.test.ts`
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Produces `createApp(options)` for tests and runtime.
- Produces `GET/PUT /api/state/:key` with `{ key, data, updatedAt }`.

- [ ] Write API tests that request a missing allowed key, reject an unknown key, save a snapshot, and read the same snapshot.
- [ ] Run `npm test -- server/app.test.ts` and confirm failure because the server modules do not exist.
- [ ] Implement configuration, SQLite schema, repository, Express app, and server entry point.
- [ ] Run `npm test -- server/app.test.ts` and confirm all state API tests pass.

### Task 2: Image upload and media delivery

**Files:**
- Modify: `server/app.test.ts`, `server/app.ts`, `server/database.ts`

**Interfaces:**
- Produces `POST /api/uploads` multipart field `image`.
- Returns `{ id, url, mimeType, size }`; serves the returned URL from `/media`.

- [ ] Add tests that upload a PNG, fetch it from the returned URL, reject text files, and reject oversized uploads.
- [ ] Run the focused tests and confirm the upload tests fail because the route is missing.
- [ ] Implement memory-buffer validation, UUID filenames, atomic file writes, media metadata insertion, and static media serving.
- [ ] Run the focused tests and confirm all upload tests pass.

### Task 3: Frontend remote persistence and automatic migration

**Files:**
- Create: `src/data/remotePersistence.ts`, `src/data/remotePersistence.test.ts`
- Modify: `src/data/store.ts`, `src/data/personalStore.ts`, `src/data/lifeSystemStore.ts`, `src/hooks/useColorSwatches.ts`, `src/main.tsx`, `vite.config.ts`

**Interfaces:**
- Produces `initializeRemotePersistence()` and `queueRemoteState(key, data)`.
- Adds `replaceStoreSnapshot()` and `lifeSystemStore.replaceSnapshot()` hydration points.

- [ ] Add tests for remote-first hydration, first-run local upload, debounced writes, API failure fallback, and Base64 image migration.
- [ ] Run `npm test -- src/data/remotePersistence.test.ts` and confirm failure because the module is missing.
- [ ] Implement the remote client, migration helpers, hydration methods, subscriptions, startup gate, and Vite development proxy.
- [ ] Run the focused tests and all existing store/component tests; update only expectations intentionally changed by server-backed images.

### Task 4: New image upload flow

**Files:**
- Create or modify test: `src/lib/itemImage.test.ts`, `src/features/personal/PersonalInventoryPage.test.tsx`
- Modify: `src/lib/itemImage.ts`, `src/features/personal/ItemDialogHost.tsx`

**Interfaces:**
- Produces `prepareAndUploadItemImage(file)` returning a `/media/...` URL when the API is available and a data URL fallback otherwise.

- [ ] Add a test proving compressed image data is posted as multipart and the returned media URL is stored.
- [ ] Run the focused test and confirm failure because upload is not implemented.
- [ ] Implement upload after existing browser compression and preserve the offline Base64 fallback.
- [ ] Run focused component tests and confirm they pass.

### Task 5: NAS containers and operator documentation

**Files:**
- Create: `Dockerfile.frontend`, `Dockerfile.backend`, `.dockerignore`, `compose.yaml`, `deploy/nginx.conf`, `.env.example`
- Modify: `.gitignore`, `README.md`, `package.json`, `package-lock.json`

**Interfaces:**
- Produces a single user-facing port `${APP_PORT:-8080}`.
- Persists data under `./nas-data/database` and `./nas-data/uploads`.

- [ ] Add build scripts and container configuration with API health checks and no published API port.
- [ ] Validate Compose with `docker compose config` when Docker is installed.
- [ ] Document local development, first-run migration, deployment, upgrades, backups, and LAN/VPN security.

### Task 6: Full verification

**Files:**
- Modify only files needed to fix verified regressions.

- [ ] Run `npm test` and require all tests to pass.
- [ ] Run `npm run build` and `npm run build:server` and require both production builds to pass.
- [ ] Start the API and Vite app, then verify health, state persistence, upload, media retrieval, and rendered UI.
- [ ] Review `git diff`, confirm no credentials or runtime data are tracked, and record deployment commands in the handoff.
