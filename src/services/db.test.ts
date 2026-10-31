import * as SQLite from 'expo-sqlite';
import {
  initDatabase,
  getMedications,
  getInjections,
  addInjection,
  deleteInjection,
  getWeightLogs,
  addWeightLog,
  deleteWeightLog,
  getSymptomLogs,
  addSymptomLog,
  deleteSymptomLog,
  getNutritionLog,
  getAllNutritionLogs,
  saveNutritionLog,
  getUserSettings,
  updateUserSettings,
  resetDatabaseInstance,
  generateUUID,
} from './db';

// In-memory SQLite mock
interface MockDbState {
  tables: Record<string, Record<string, any>[]>;
  executedSql: { sql: string; params: any[] }[];
}

const mockState: MockDbState = {
  tables: {},
  executedSql: [],
};

function resetMockDb() {
  mockState.tables = {};
  mockState.executedSql = [];
}

const mockDatabase = {
  execAsync: jest.fn(async (sql: string) => {
    mockState.executedSql.push({ sql, params: [] });
    // Match CREATE TABLE IF NOT EXISTS <table_name>
    const createMatches = sql.matchAll(/CREATE TABLE IF NOT EXISTS\s+(\w+)/gi);
    for (const match of createMatches) {
      const tableName = match[1];
      if (!mockState.tables[tableName]) {
        mockState.tables[tableName] = [];
      }
    }
  }),
  runAsync: jest.fn(async (sql: string, ...params: any[]) => {
    mockState.executedSql.push({ sql, params });

    // Handle INSERT INTO <table> (<cols>) VALUES (<placeholders>)
    const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES/i);
    if (insertMatch) {
      const tableName = insertMatch[1];
      const cols = insertMatch[2].split(',').map((c) => c.trim());
      const row: Record<string, any> = {};
      cols.forEach((col, idx) => {
        row[col] = params[idx] !== undefined ? params[idx] : null;
      });
      if (!mockState.tables[tableName]) {
        mockState.tables[tableName] = [];
      }
      mockState.tables[tableName].push(row);
      return { changes: 1, lastInsertRowId: mockState.tables[tableName].length };
    }

    // Handle UPDATE <table> SET <assignments> WHERE <condition>
    const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i);
    if (updateMatch) {
      const tableName = updateMatch[1];
      const setClause = updateMatch[2];
      const whereClause = updateMatch[3];
      const table = mockState.tables[tableName] || [];

      // Extract set columns
      const setAssignments = setClause.split(',').map((s) => s.trim().split('=')[0].trim());

      if (whereClause.includes('id = ?')) {
        const idParam = params[params.length - 1];
        const target = table.find((r) => r.id === idParam);
        if (target) {
          setAssignments.forEach((col, idx) => {
            target[col] = params[idx];
          });
          return { changes: 1, lastInsertRowId: 0 };
        }
      } else if (whereClause.includes('date = ?')) {
        const dateParam = params[params.length - 1];
        const target = table.find((r) => r.date === dateParam);
        if (target) {
          setAssignments.forEach((col, idx) => {
            target[col] = params[idx];
          });
          return { changes: 1, lastInsertRowId: 0 };
        }
      }
      return { changes: 0, lastInsertRowId: 0 };
    }

    return { changes: 1, lastInsertRowId: 1 };
  }),
  getAllAsync: jest.fn(async <T>(sql: string, ...params: any[]): Promise<T[]> => {
    mockState.executedSql.push({ sql, params });

    // Handle count queries
    const countMatch = sql.match(/SELECT\s+count\(\*\)\s+as\s+count\s+FROM\s+(\w+)/i);
    if (countMatch) {
      const tableName = countMatch[1];
      const count = mockState.tables[tableName]?.length ?? 0;
      return [{ count }] as unknown as T[];
    }

    // Handle SELECT * FROM medications
    if (/FROM\s+medications/i.test(sql)) {
      return [...(mockState.tables['medications'] || [])] as unknown as T[];
    }

    // Handle SELECT * FROM injections
    if (/FROM\s+injections/i.test(sql)) {
      let rows = [...(mockState.tables['injections'] || [])];
      if (/deleted_at\s+IS\s+NULL/i.test(sql)) {
        rows = rows.filter((r) => !r.deleted_at);
      }
      if (/ORDER\s+BY\s+injected_at\s+DESC/i.test(sql)) {
        rows.sort((a, b) => new Date(b.injected_at).getTime() - new Date(a.injected_at).getTime());
      }
      return rows as unknown as T[];
    }

    // Handle SELECT * FROM weight_logs
    if (/FROM\s+weight_logs/i.test(sql)) {
      let rows = [...(mockState.tables['weight_logs'] || [])];
      if (/deleted_at\s+IS\s+NULL/i.test(sql)) {
        rows = rows.filter((r) => !r.deleted_at);
      }
      if (/ORDER\s+BY\s+logged_at\s+DESC/i.test(sql)) {
        rows.sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());
      }
      return rows as unknown as T[];
    }

    // Handle SELECT * FROM symptom_logs
    if (/FROM\s+symptom_logs/i.test(sql)) {
      let rows = [...(mockState.tables['symptom_logs'] || [])];
      if (/deleted_at\s+IS\s+NULL/i.test(sql)) {
        rows = rows.filter((r) => !r.deleted_at);
      }
      if (/ORDER\s+BY\s+logged_at\s+DESC/i.test(sql)) {
        rows.sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());
      }
      return rows as unknown as T[];
    }

    // Handle SELECT * FROM nutrition_logs
    if (/FROM\s+nutrition_logs/i.test(sql)) {
      let rows = [...(mockState.tables['nutrition_logs'] || [])];
      if (/WHERE\s+date\s*=\s*\?/i.test(sql)) {
        rows = rows.filter((r) => r.date === params[0]);
      }
      if (/ORDER\s+BY\s+date\s+DESC/i.test(sql)) {
        rows.sort((a, b) => b.date.localeCompare(a.date));
      }
      return rows as unknown as T[];
    }

    // Handle SELECT * FROM user_settings
    if (/FROM\s+user_settings/i.test(sql)) {
      return [...(mockState.tables['user_settings'] || [])] as unknown as T[];
    }

    return [] as T[];
  }),
  getFirstAsync: jest.fn(async (sql: string, ...params: any[]) => {
    const results = (await mockDatabase.getAllAsync(sql, ...params)) as any[];
    return results.length > 0 ? results[0] : null;
  }),
  closeAsync: jest.fn(async () => {}),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => mockDatabase),
}));

describe('SQLite Database & Repository Layer (db.ts)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    resetMockDb();
    resetDatabaseInstance();
  });

  describe('Database Initialization & Seeding', () => {
    it('initializes the database with WAL mode and foreign keys enabled', async () => {
      await initDatabase();

      expect(SQLite.openDatabaseAsync).toHaveBeenCalledWith('glp_tracker.db');

      // Check executed SQL for WAL and foreign_keys
      const pragmaCalls = mockState.executedSql.filter((call) =>
        call.sql.includes('PRAGMA journal_mode = WAL') || call.sql.includes('PRAGMA foreign_keys = ON')
      );
      expect(pragmaCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('creates all required tables', async () => {
      await initDatabase();

      const requiredTables = [
        'medications',
        'injections',
        'weight_logs',
        'symptom_logs',
        'nutrition_logs',
        'user_settings',
      ];

      for (const table of requiredTables) {
        expect(mockState.tables).toHaveProperty(table);
      }
    });

    it('seeds default medications on initial launch (Semaglutide, Tirzepatide, Retatrutide)', async () => {
      const meds = await getMedications();

      expect(meds.length).toBe(3);
      const names = meds.map((m) => m.name);
      expect(names).toContain('Semaglutid (Ozempic/Wegovy)');
      expect(names).toContain('Tirzepatid (Mounjaro/Zepbound)');
      expect(names).toContain('Retatrutid');

      const semaglutide = meds.find((m) => m.type === 'semaglutide');
      expect(semaglutide?.halfLifeHours).toBe(168);

      const tirzepatide = meds.find((m) => m.type === 'tirzepatide');
      expect(tirzepatide?.halfLifeHours).toBe(120);

      const retatrutide = meds.find((m) => m.type === 'retatrutide');
      expect(retatrutide?.halfLifeHours).toBe(144);
    });

    it('does not re-seed medications if tables already contain data', async () => {
      await initDatabase();
      const firstCallCount = mockState.tables['medications'].length;
      expect(firstCallCount).toBe(3);

      // Re-trigger initDatabase
      resetDatabaseInstance();
      await initDatabase();
      expect(mockState.tables['medications'].length).toBe(3);
    });

    it('seeds default user settings with protein and water targets', async () => {
      const settings = await getUserSettings();

      expect(settings).toBeDefined();
      expect(settings.dailyProteinTargetG).toBe(100);
      expect(settings.dailyWaterTargetMl).toBe(2500);
      expect(settings.id).toBeDefined();
    });
  });

  describe('UUID Generation Utility', () => {
    it('generates a valid UUID string', () => {
      const uuid = generateUUID();
      expect(typeof uuid).toBe('string');
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('Injections CRUD', () => {
    it('adds an injection and retrieves it', async () => {
      const meds = await getMedications();
      const medId = meds[0].id;

      const newInjection = await addInjection({
        medicationId: medId,
        doseMg: 0.5,
        injectedAt: '2026-10-31T08:00:00.000Z',
        site: 'abdomen_left',
        notes: 'First dose',
      });

      expect(newInjection.id).toBeDefined();
      expect(newInjection.medicationId).toBe(medId);
      expect(newInjection.doseMg).toBe(0.5);
      expect(newInjection.site).toBe('abdomen_left');
      expect(newInjection.notes).toBe('First dose');
      expect(newInjection.createdAt).toBeDefined();
      expect(newInjection.updatedAt).toBeDefined();
      expect(newInjection.deletedAt).toBeNull();

      const injections = await getInjections();
      expect(injections.length).toBe(1);
      expect(injections[0].id).toBe(newInjection.id);
    });

    it('orders injections chronologically descending (most recent first)', async () => {
      const meds = await getMedications();
      const medId = meds[0].id;

      await addInjection({
        medicationId: medId,
        doseMg: 0.25,
        injectedAt: '2026-10-20T08:00:00.000Z',
        site: 'abdomen_left',
      });

      await addInjection({
        medicationId: medId,
        doseMg: 0.5,
        injectedAt: '2026-10-27T08:00:00.000Z',
        site: 'thigh_right',
      });

      const injections = await getInjections();
      expect(injections.length).toBe(2);
      expect(injections[0].doseMg).toBe(0.5);
      expect(injections[1].doseMg).toBe(0.25);
    });

    it('soft-deletes an injection so it is excluded from getInjections()', async () => {
      const meds = await getMedications();
      const med = await addInjection({
        medicationId: meds[0].id,
        doseMg: 0.25,
        injectedAt: '2026-10-20T08:00:00.000Z',
        site: 'abdomen_left',
      });

      expect((await getInjections()).length).toBe(1);

      await deleteInjection(med.id);

      const remaining = await getInjections();
      expect(remaining.length).toBe(0);

      // Verify the row still exists in table but deleted_at is set
      const rawInjections = mockState.tables['injections'];
      expect(rawInjections.length).toBe(1);
      expect(rawInjections[0].deleted_at).toBeDefined();
    });
  });

  describe('Weight Logs CRUD', () => {
    it('adds a weight log and retrieves it', async () => {
      const log = await addWeightLog(85.5, '2026-10-31T09:00:00.000Z');

      expect(log.id).toBeDefined();
      expect(log.weightKg).toBe(85.5);
      expect(log.loggedAt).toBe('2026-10-31T09:00:00.000Z');
      expect(log.deletedAt).toBeNull();

      const logs = await getWeightLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].weightKg).toBe(85.5);
    });

    it('defaults loggedAt to current time if not provided', async () => {
      const before = new Date().toISOString();
      const log = await addWeightLog(84.0);
      const after = new Date().toISOString();

      expect(log.loggedAt >= before).toBe(true);
      expect(log.loggedAt <= after).toBe(true);
    });

    it('soft-deletes a weight log', async () => {
      const log = await addWeightLog(83.0);
      expect((await getWeightLogs()).length).toBe(1);

      await deleteWeightLog(log.id);

      const logs = await getWeightLogs();
      expect(logs.length).toBe(0);

      const rawLogs = mockState.tables['weight_logs'];
      expect(rawLogs[0].deleted_at).toBeDefined();
    });
  });

  describe('Symptom Logs CRUD', () => {
    it('adds a symptom log with severity and notes', async () => {
      const symptom = await addSymptomLog({
        symptomType: 'nausea',
        severity: 3,
        notes: 'Felt slight nausea after breakfast',
        loggedAt: '2026-10-31T10:00:00.000Z',
      });

      expect(symptom.id).toBeDefined();
      expect(symptom.symptomType).toBe('nausea');
      expect(symptom.severity).toBe(3);
      expect(symptom.notes).toBe('Felt slight nausea after breakfast');
      expect(symptom.deletedAt).toBeNull();

      const symptoms = await getSymptomLogs();
      expect(symptoms.length).toBe(1);
      expect(symptoms[0].id).toBe(symptom.id);
    });

    it('soft-deletes a symptom log', async () => {
      const symptom = await addSymptomLog({
        symptomType: 'fatigue',
        severity: 2,
        loggedAt: '2026-10-31T10:00:00.000Z',
      });

      await deleteSymptomLog(symptom.id);

      const symptoms = await getSymptomLogs();
      expect(symptoms.length).toBe(0);
    });
  });

  describe('Nutrition Logs CRUD (Upsert)', () => {
    it('returns null if no nutrition log exists for a given date', async () => {
      const log = await getNutritionLog('2026-10-31');
      expect(log).toBeNull();
    });

    it('saves a new nutrition log if none exists for the date', async () => {
      const saved = await saveNutritionLog('2026-10-31', 110, 2600);

      expect(saved.id).toBeDefined();
      expect(saved.date).toBe('2026-10-31');
      expect(saved.proteinG).toBe(110);
      expect(saved.waterMl).toBe(2600);

      const fetched = await getNutritionLog('2026-10-31');
      expect(fetched?.proteinG).toBe(110);
      expect(fetched?.waterMl).toBe(2600);
    });

    it('updates existing nutrition log when saved again for the same date', async () => {
      await saveNutritionLog('2026-10-31', 90, 2000);
      const updated = await saveNutritionLog('2026-10-31', 120, 3000);

      expect(updated.proteinG).toBe(120);
      expect(updated.waterMl).toBe(3000);

      // Verify only 1 record exists for that date
      const allRows = mockState.tables['nutrition_logs'].filter((r) => r.date === '2026-10-31');
      expect(allRows.length).toBe(1);
      expect(allRows[0].protein_g).toBe(120);
      expect(allRows[0].water_ml).toBe(3000);
    });

    it('retrieves all nutrition logs ordered by date', async () => {
      await saveNutritionLog('2026-10-30', 95, 2200);
      await saveNutritionLog('2026-10-31', 110, 2500);

      const logs = await getAllNutritionLogs();
      expect(logs.length).toBe(2);
      expect(logs[0].date).toBe('2026-10-31');
      expect(logs[1].date).toBe('2026-10-30');
    });
  });

  describe('User Settings CRUD', () => {
    it('updates user settings partially and preserves untouched fields', async () => {
      const initial = await getUserSettings();
      expect(initial.dailyProteinTargetG).toBe(100);
      expect(initial.dailyWaterTargetMl).toBe(2500);

      const updated = await updateUserSettings({
        targetWeightKg: 75.0,
        currentDoseMg: 0.5,
        preferredInjectionDay: 1, // Monday
      });

      expect(updated.targetWeightKg).toBe(75.0);
      expect(updated.currentDoseMg).toBe(0.5);
      expect(updated.preferredInjectionDay).toBe(1);
      expect(updated.dailyProteinTargetG).toBe(100);
      expect(updated.dailyWaterTargetMl).toBe(2500);

      const refetched = await getUserSettings();
      expect(refetched.targetWeightKg).toBe(75.0);
      expect(refetched.currentDoseMg).toBe(0.5);
    });
  });
});
