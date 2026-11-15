import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance: DatabaseSync | null = null;

export function getDbPath(): string {
  if (process.env.SELLVION_DB_PATH) {
    return process.env.SELLVION_DB_PATH;
  }
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'sellvion.db');
}

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dbPath = getDbPath();
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');

  runMigrations(db);
  dbInstance = db;
  return db;
}

export function resetDbForTests(customPath: string): DatabaseSync {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore
    }
    dbInstance = null;
  }
  process.env.SELLVION_DB_PATH = customPath;
  return getDb();
}

function runMigrations(db: DatabaseSync): void {
  const migrationPath = path.resolve(__dirname, '../../migrations/001_init.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = db
    .prepare('SELECT version FROM schema_migrations WHERE version = ?')
    .get('001_init') as { version: string } | undefined;

  if (!applied) {
    db.exec(sql);
    db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run('001_init');
  }
}

export function writeAuditLog(
  db: DatabaseSync,
  params: {
    id: string;
    businessId: string;
    userId?: string | null;
    actorType: 'merchant' | 'agent' | 'system' | 'webhook';
    action: string;
    entityType: string;
    entityId: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
  }
): void {
  db.prepare(
    `INSERT INTO audit_logs (id, business_id, user_id, actor_type, action, entity_type, entity_id, details_json, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    params.id,
    params.businessId,
    params.userId ?? null,
    params.actorType,
    params.action,
    params.entityType,
    params.entityId,
    JSON.stringify(params.details ?? {}),
    params.ipAddress ?? ''
  );
}
