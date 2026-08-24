import path from "node:path";

export interface ServerConfig {
  port: number;
  databasePath: string;
  uploadsDirectory: string;
  frontendDirectory?: string;
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): ServerConfig {
  const dataDirectory = path.resolve(environment.DATA_DIR ?? "data");
  return {
    port: Number(environment.PORT ?? 3000),
    databasePath: path.resolve(environment.DATABASE_PATH ?? path.join(dataDirectory, "database", "app.sqlite")),
    uploadsDirectory: path.resolve(environment.UPLOADS_DIR ?? path.join(dataDirectory, "uploads")),
    frontendDirectory: environment.FRONTEND_DIR ? path.resolve(environment.FRONTEND_DIR) : undefined,
  };
}
