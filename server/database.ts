import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export type AppDatabase = Database.Database;

export function openDatabase(databasePath: string): AppDatabase {
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS media_files (
      id TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL UNIQUE,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      relative_path TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return database;
}
