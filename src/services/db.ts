import * as SQLite from 'expo-sqlite';
import {
  Medication,
  Injection,
  WeightLog,
  SymptomLog,
  NutritionLog,
  UserSettings,
} from '../types';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function resetDatabaseInstance(): void {
  dbInstance = null;
  initPromise = null;
}

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync('glp_tracker.db');

    // 1. Enable WAL mode & foreign keys
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
    `);

    // 2. Create tables
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS medications (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        half_life_hours REAL NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS injections (
        id TEXT PRIMARY KEY NOT NULL,
        medication_id TEXT NOT NULL,
        dose_mg REAL NOT NULL,
        injected_at TEXT NOT NULL,
        site TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY (medication_id) REFERENCES medications(id)
      );

      CREATE TABLE IF NOT EXISTS weight_logs (
        id TEXT PRIMARY KEY NOT NULL,
        weight_kg REAL NOT NULL,
        logged_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS symptom_logs (
        id TEXT PRIMARY KEY NOT NULL,
        symptom_type TEXT NOT NULL,
        severity INTEGER NOT NULL,
        notes TEXT,
        logged_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS nutrition_logs (
        id TEXT PRIMARY KEY NOT NULL,
        protein_g REAL NOT NULL DEFAULT 0,
        water_ml REAL NOT NULL DEFAULT 0,
        date TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_settings (
        id TEXT PRIMARY KEY NOT NULL,
        active_medication_id TEXT,
        current_dose_mg REAL,
        preferred_injection_day INTEGER,
        target_weight_kg REAL,
        daily_protein_target_g REAL NOT NULL DEFAULT 100,
        daily_water_target_ml REAL NOT NULL DEFAULT 2500,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (active_medication_id) REFERENCES medications(id)
      );
    `);

    // 3. Seed default medications if empty
    const countMedRow = await db.getFirstAsync<{ count: number }>(
      'SELECT count(*) as count FROM medications;'
    );
    if (!countMedRow || countMedRow.count === 0) {
      const now = new Date().toISOString();
      const defaultMeds = [
        {
          name: 'Semaglutid (Ozempic/Wegovy)',
          type: 'semaglutide',
          halfLifeHours: 168,
        },
        {
          name: 'Tirzepatid (Mounjaro/Zepbound)',
          type: 'tirzepatide',
          halfLifeHours: 120,
        },
        {
          name: 'Retatrutid',
          type: 'retatrutide',
          halfLifeHours: 144,
        },
      ];

      for (const med of defaultMeds) {
        await db.runAsync(
          'INSERT INTO medications (id, name, type, half_life_hours, created_at) VALUES (?, ?, ?, ?, ?);',
          generateUUID(),
          med.name,
          med.type,
          med.halfLifeHours,
          now
        );
      }
    }

    // 4. Seed default user_settings if empty
    const countSettingsRow = await db.getFirstAsync<{ count: number }>(
      'SELECT count(*) as count FROM user_settings;'
    );
    if (!countSettingsRow || countSettingsRow.count === 0) {
      const now = new Date().toISOString();
      await db.runAsync(
        'INSERT INTO user_settings (id, daily_protein_target_g, daily_water_target_ml, updated_at) VALUES (?, ?, ?, ?);',
        generateUUID(),
        100,
        2500,
        now
      );
    }

    dbInstance = db;
    return db;
  })();

  return initPromise;
}

// -------------------------------------------------------------
// Medications
// -------------------------------------------------------------

export async function getMedications(): Promise<Medication[]> {
  const db = await initDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    type: Medication['type'];
    half_life_hours: number;
    created_at: string;
  }>('SELECT * FROM medications ORDER BY created_at ASC;');

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    halfLifeHours: Number(row.half_life_hours),
    createdAt: row.created_at,
  }));
}

// -------------------------------------------------------------
// Injections
// -------------------------------------------------------------

export async function getInjections(): Promise<Injection[]> {
  const db = await initDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    medication_id: string;
    dose_mg: number;
    injected_at: string;
    site: Injection['site'];
    notes: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  }>('SELECT * FROM injections WHERE deleted_at IS NULL ORDER BY injected_at DESC;');

  return rows.map((row) => ({
    id: row.id,
    medicationId: row.medication_id,
    doseMg: Number(row.dose_mg),
    injectedAt: row.injected_at,
    site: row.site,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || null,
  }));
}

export async function addInjection(
  data: Omit<Injection, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
): Promise<Injection> {
  const db = await initDatabase();
  const id = generateUUID();
  const now = new Date().toISOString();
  const injection: Injection = {
    id,
    medicationId: data.medicationId,
    doseMg: data.doseMg,
    injectedAt: data.injectedAt,
    site: data.site,
    notes: data.notes,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  await db.runAsync(
    'INSERT INTO injections (id, medication_id, dose_mg, injected_at, site, notes, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL);',
    injection.id,
    injection.medicationId,
    injection.doseMg,
    injection.injectedAt,
    injection.site,
    injection.notes ?? null,
    injection.createdAt,
    injection.updatedAt
  );

  return injection;
}

export async function deleteInjection(id: string): Promise<void> {
  const db = await initDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE injections SET deleted_at = ?, updated_at = ? WHERE id = ?;',
    now,
    now,
    id
  );
}

// -------------------------------------------------------------
// Weight Logs
// -------------------------------------------------------------

export async function getWeightLogs(): Promise<WeightLog[]> {
  const db = await initDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    weight_kg: number;
    logged_at: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  }>('SELECT * FROM weight_logs WHERE deleted_at IS NULL ORDER BY logged_at DESC;');

  return rows.map((row) => ({
    id: row.id,
    weightKg: Number(row.weight_kg),
    loggedAt: row.logged_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || null,
  }));
}

export async function addWeightLog(
  weightKg: number,
  loggedAt?: string
): Promise<WeightLog> {
  const db = await initDatabase();
  const id = generateUUID();
  const now = new Date().toISOString();
  const log: WeightLog = {
    id,
    weightKg,
    loggedAt: loggedAt || now,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  await db.runAsync(
    'INSERT INTO weight_logs (id, weight_kg, logged_at, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, NULL);',
    log.id,
    log.weightKg,
    log.loggedAt,
    log.createdAt,
    log.updatedAt
  );

  return log;
}

export async function deleteWeightLog(id: string): Promise<void> {
  const db = await initDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE weight_logs SET deleted_at = ?, updated_at = ? WHERE id = ?;',
    now,
    now,
    id
  );
}

// -------------------------------------------------------------
// Symptom Logs
// -------------------------------------------------------------

export async function getSymptomLogs(): Promise<SymptomLog[]> {
  const db = await initDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    symptom_type: SymptomLog['symptomType'];
    severity: number;
    notes: string | null;
    logged_at: string;
    created_at: string;
    deleted_at: string | null;
  }>('SELECT * FROM symptom_logs WHERE deleted_at IS NULL ORDER BY logged_at DESC;');

  return rows.map((row) => ({
    id: row.id,
    symptomType: row.symptom_type,
    severity: Number(row.severity) as SymptomLog['severity'],
    notes: row.notes || undefined,
    loggedAt: row.logged_at,
    createdAt: row.created_at,
    deletedAt: row.deleted_at || null,
  }));
}

export async function addSymptomLog(
  data: Omit<SymptomLog, 'id' | 'createdAt' | 'deletedAt'>
): Promise<SymptomLog> {
  const db = await initDatabase();
  const id = generateUUID();
  const now = new Date().toISOString();
  const log: SymptomLog = {
    id,
    symptomType: data.symptomType,
    severity: data.severity,
    notes: data.notes,
    loggedAt: data.loggedAt || now,
    createdAt: now,
    deletedAt: null,
  };

  await db.runAsync(
    'INSERT INTO symptom_logs (id, symptom_type, severity, notes, logged_at, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, NULL);',
    log.id,
    log.symptomType,
    log.severity,
    log.notes ?? null,
    log.loggedAt,
    log.createdAt
  );

  return log;
}

export async function deleteSymptomLog(id: string): Promise<void> {
  const db = await initDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE symptom_logs SET deleted_at = ? WHERE id = ?;',
    now,
    id
  );
}

// -------------------------------------------------------------
// Nutrition Logs (Daily Protein & Water)
// -------------------------------------------------------------

export async function getNutritionLog(date: string): Promise<NutritionLog | null> {
  const db = await initDatabase();
  const row = await db.getFirstAsync<{
    id: string;
    protein_g: number;
    water_ml: number;
    date: string;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM nutrition_logs WHERE date = ?;', date);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    proteinG: Number(row.protein_g),
    waterMl: Number(row.water_ml),
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function saveNutritionLog(
  date: string,
  proteinG: number,
  waterMl: number
): Promise<NutritionLog> {
  const db = await initDatabase();
  const now = new Date().toISOString();
  const existing = await getNutritionLog(date);

  if (existing) {
    await db.runAsync(
      'UPDATE nutrition_logs SET protein_g = ?, water_ml = ?, updated_at = ? WHERE date = ?;',
      proteinG,
      waterMl,
      now,
      date
    );
    return {
      ...existing,
      proteinG,
      waterMl,
      updatedAt: now,
    };
  }

  const newLog: NutritionLog = {
    id: generateUUID(),
    proteinG,
    waterMl,
    date,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    'INSERT INTO nutrition_logs (id, protein_g, water_ml, date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);',
    newLog.id,
    newLog.proteinG,
    newLog.waterMl,
    newLog.date,
    newLog.createdAt,
    newLog.updatedAt
  );

  return newLog;
}

export async function getAllNutritionLogs(): Promise<NutritionLog[]> {
  const db = await initDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    protein_g: number;
    water_ml: number;
    date: string;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM nutrition_logs ORDER BY date DESC;');

  return rows.map((row) => ({
    id: row.id,
    proteinG: Number(row.protein_g),
    waterMl: Number(row.water_ml),
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

// -------------------------------------------------------------
// User Settings
// -------------------------------------------------------------

export async function getUserSettings(): Promise<UserSettings> {
  const db = await initDatabase();
  const row = await db.getFirstAsync<{
    id: string;
    active_medication_id: string | null;
    current_dose_mg: number | null;
    preferred_injection_day: number | null;
    target_weight_kg: number | null;
    daily_protein_target_g: number;
    daily_water_target_ml: number;
    updated_at: string;
  }>('SELECT * FROM user_settings LIMIT 1;');

  if (!row) {
    const now = new Date().toISOString();
    const defaultSettings: UserSettings = {
      id: generateUUID(),
      dailyProteinTargetG: 100,
      dailyWaterTargetMl: 2500,
      updatedAt: now,
    };

    await db.runAsync(
      'INSERT INTO user_settings (id, daily_protein_target_g, daily_water_target_ml, updated_at) VALUES (?, ?, ?, ?);',
      defaultSettings.id,
      defaultSettings.dailyProteinTargetG,
      defaultSettings.dailyWaterTargetMl,
      defaultSettings.updatedAt
    );

    return defaultSettings;
  }

  return {
    id: row.id,
    activeMedicationId: row.active_medication_id || undefined,
    currentDoseMg: row.current_dose_mg != null ? Number(row.current_dose_mg) : undefined,
    preferredInjectionDay:
      row.preferred_injection_day != null ? Number(row.preferred_injection_day) : undefined,
    targetWeightKg: row.target_weight_kg != null ? Number(row.target_weight_kg) : undefined,
    dailyProteinTargetG: Number(row.daily_protein_target_g),
    dailyWaterTargetMl: Number(row.daily_water_target_ml),
    updatedAt: row.updated_at,
  };
}

export async function updateUserSettings(
  settings: Partial<UserSettings>
): Promise<UserSettings> {
  const db = await initDatabase();
  const current = await getUserSettings();
  const now = new Date().toISOString();

  const merged: UserSettings = {
    ...current,
    ...settings,
    updatedAt: now,
  };

  await db.runAsync(
    'UPDATE user_settings SET active_medication_id = ?, current_dose_mg = ?, preferred_injection_day = ?, target_weight_kg = ?, daily_protein_target_g = ?, daily_water_target_ml = ?, updated_at = ? WHERE id = ?;',
    merged.activeMedicationId ?? null,
    merged.currentDoseMg ?? null,
    merged.preferredInjectionDay ?? null,
    merged.targetWeightKg ?? null,
    merged.dailyProteinTargetG,
    merged.dailyWaterTargetMl,
    merged.updatedAt,
    merged.id
  );

  return merged;
}
