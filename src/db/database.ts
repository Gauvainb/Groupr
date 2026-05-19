import { SQLiteDatabase } from 'expo-sqlite';
import { Equipment, EquipmentType, Session, Discipline, Group, SessionWithDetails } from '../types';

export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      caliber TEXT NOT NULL,
      optic TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      discipline TEXT NOT NULL,
      distance REAL NOT NULL,
      distanceUnit TEXT NOT NULL DEFAULT 'm',
      equipmentId INTEGER,
      shots INTEGER NOT NULL DEFAULT 0,
      score REAL,
      maxScore REAL,
      ammoDescription TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (equipmentId) REFERENCES equipment(id)
    );

    CREATE TABLE IF NOT EXISTS groups_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId INTEGER NOT NULL,
      sizeMm REAL NOT NULL,
      shotCount INTEGER NOT NULL DEFAULT 5,
      label TEXT,
      FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);
}

// ─── Equipment ───────────────────────────────────────────────────────────────

export async function getEquipment(db: SQLiteDatabase): Promise<Equipment[]> {
  return db.getAllAsync<Equipment>(
    'SELECT * FROM equipment ORDER BY name ASC'
  );
}

export async function addEquipment(
  db: SQLiteDatabase,
  eq: Omit<Equipment, 'id' | 'createdAt'>
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO equipment (name, type, caliber, optic, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    [eq.name, eq.type, eq.caliber, eq.optic ?? null, eq.notes ?? null, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export async function deleteEquipment(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM equipment WHERE id = ?', [id]);
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function getSessions(db: SQLiteDatabase): Promise<Session[]> {
  return db.getAllAsync<Session>(
    'SELECT * FROM sessions ORDER BY date DESC, createdAt DESC'
  );
}

export async function getSessionWithDetails(
  db: SQLiteDatabase,
  id: number
): Promise<SessionWithDetails | null> {
  const session = await db.getFirstAsync<Session>(
    'SELECT * FROM sessions WHERE id = ?',
    [id]
  );
  if (!session) return null;

  const equipment = session.equipmentId
    ? (await db.getFirstAsync<Equipment>(
        'SELECT * FROM equipment WHERE id = ?',
        [session.equipmentId]
      )) ?? undefined
    : undefined;

  const groups = await db.getAllAsync<Group>(
    'SELECT * FROM groups_data WHERE sessionId = ? ORDER BY id ASC',
    [id]
  );

  return { ...session, equipment, groups };
}

export async function addSession(
  db: SQLiteDatabase,
  s: Omit<Session, 'id' | 'createdAt'>
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO sessions
       (date, discipline, distance, distanceUnit, equipmentId, shots,
        score, maxScore, ammoDescription, notes, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      s.date,
      s.discipline,
      s.distance,
      s.distanceUnit,
      s.equipmentId ?? null,
      s.shots,
      s.score ?? null,
      s.maxScore ?? null,
      s.ammoDescription ?? null,
      s.notes ?? null,
      new Date().toISOString(),
    ]
  );
  return result.lastInsertRowId;
}

export async function deleteSession(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM sessions WHERE id = ?', [id]);
  await db.runAsync('DELETE FROM groups_data WHERE sessionId = ?', [id]);
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export async function addGroup(
  db: SQLiteDatabase,
  g: Omit<Group, 'id'>
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO groups_data (sessionId, sizeMm, shotCount, label) VALUES (?, ?, ?, ?)',
    [g.sessionId, g.sizeMm, g.shotCount, g.label ?? null]
  );
  return result.lastInsertRowId;
}

export async function deleteGroup(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM groups_data WHERE id = ?', [id]);
}

// ─── Stats & Charts ───────────────────────────────────────────────────────────

export async function getStats(db: SQLiteDatabase) {
  const totalRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sessions'
  );
  const bestGroupRow = await db.getFirstAsync<{ sizeMm: number }>(
    'SELECT MIN(sizeMm) as sizeMm FROM groups_data'
  );
  const avgGroupRow = await db.getFirstAsync<{ avg: number }>(
    'SELECT AVG(sizeMm) as avg FROM groups_data'
  );
  const scoreRows = await db.getAllAsync<{ score: number; maxScore: number }>(
    'SELECT score, maxScore FROM sessions WHERE score IS NOT NULL AND maxScore IS NOT NULL AND maxScore > 0'
  );

  const bestScorePct =
    scoreRows.length > 0
      ? Math.max(...scoreRows.map((r) => (r.score / r.maxScore) * 100))
      : null;

  return {
    totalSessions: totalRow?.count ?? 0,
    bestScorePct,
    bestGroupMm: bestGroupRow?.sizeMm ?? null,
    avgGroupMm: avgGroupRow?.avg ?? null,
  };
}

export async function getSessionsForChart(db: SQLiteDatabase, limit = 20) {
  const sessions = await db.getAllAsync<Session>(
    'SELECT * FROM sessions ORDER BY date ASC, createdAt ASC LIMIT ?',
    [limit]
  );
  const result: { session: Session; groups: Group[] }[] = [];
  for (const s of sessions) {
    const groups = await db.getAllAsync<Group>(
      'SELECT * FROM groups_data WHERE sessionId = ?',
      [s.id]
    );
    result.push({ session: s, groups });
  }
  return result;
}
