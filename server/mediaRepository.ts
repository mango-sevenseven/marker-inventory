import type { AppDatabase } from "./database.js";

export interface MediaRecord {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  relativePath: string;
  createdAt: string;
}

export function createMediaRepository(database: AppDatabase) {
  const insertStatement = database.prepare(`
    INSERT INTO media_files (
      id, original_name, stored_name, mime_type, size_bytes, relative_path, created_at
    ) VALUES (
      @id, @originalName, @storedName, @mimeType, @size, @relativePath, @createdAt
    )
  `);

  return {
    insert(record: MediaRecord) {
      insertStatement.run(record);
      return record;
    },
  };
}
