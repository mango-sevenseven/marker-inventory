import type { AppDatabase } from "./database.js";

export const STATE_KEYS = [
  "marker-inventory",
  "personal-inventory",
  "life-system",
  "color-swatches",
] as const;

export type StateKey = typeof STATE_KEYS[number];

export interface StoredState<T = unknown> {
  key: StateKey;
  data: T;
  updatedAt: string;
}

interface StateRow {
  key: StateKey;
  payload: string;
  updated_at: string;
}

export function isStateKey(value: string): value is StateKey {
  return (STATE_KEYS as readonly string[]).includes(value);
}

export function createStateRepository(database: AppDatabase) {
  const findStatement = database.prepare("SELECT key, payload, updated_at FROM app_state WHERE key = ?");
  const saveStatement = database.prepare(`
    INSERT INTO app_state (key, payload, updated_at)
    VALUES (@key, @payload, @updatedAt)
    ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
  `);

  return {
    find<T>(key: StateKey): StoredState<T> | null {
      const row = findStatement.get(key) as StateRow | undefined;
      if (!row) return null;
      return { key: row.key, data: JSON.parse(row.payload) as T, updatedAt: row.updated_at };
    },
    save<T>(key: StateKey, data: T): StoredState<T> {
      const updatedAt = new Date().toISOString();
      saveStatement.run({ key, payload: JSON.stringify(data), updatedAt });
      return { key, data, updatedAt };
    },
  };
}
