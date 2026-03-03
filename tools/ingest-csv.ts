/**
 * CSV → SQLite ingestion script.
 *
 * Usage:
 *   npx nx run backend:ingest              # normal run (skips already-imported files)
 *   npx nx run backend:ingest -- --force   # re-import everything
 */
import Database from 'better-sqlite3';
import { createReadStream } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { parse } from 'csv-parse';

// __dirname = <workspace>/tools — resolve relative to workspace root
const WORKSPACE_ROOT = join(__dirname, '..');
const CSV_DIR = join(WORKSPACE_ROOT, 'data', 'csb');
const DB_PATH = join(WORKSPACE_ROOT, 'data', 'csb.db');
const BATCH_SIZE = 5_000;
const FORCE = process.argv.includes('--force');
const YEAR_FROM = process.env['DATA_YEAR_FROM'] ? parseInt(process.env['DATA_YEAR_FROM'], 10) : null;

// ---------------------------------------------------------------------------
// Column mapping: CSV header (quoted or unquoted) → DB column name
// ---------------------------------------------------------------------------
const COLUMN_MAP: Record<string, string> = {
  REQUESTID: 'request_id',
  CALLERTYPE: 'caller_type',
  CITY: 'city',
  DATECANCELLED: 'date_cancelled',
  DATEINVTDONE: 'date_invt_done',
  DATETIMECLOSED: 'date_time_closed',
  DATETIMEINIT: 'date_time_init',
  DESCRIPTION: 'description',
  EXPLANATION: 'explanation',
  GRANDPARENT_ID: 'grandparent_id',
  GRANDPARENT_NODE: 'grandparent_node',
  GROUP: 'group_name',
  NEIGHBORHOOD: 'neighborhood',
  PARENT_ID: 'parent_id',
  PARENT_NODE: 'parent_node',
  PLAIN_ENGLISH_NAME_FOR_PROBLEMCODE: 'plain_english_name',
  PRJCOMPLETEDATE: 'prj_complete_date',
  PROBADDRESS: 'prob_address',
  PROBADDTYPE: 'prob_add_type',
  PROBLEMCODE: 'problem_code',
  PROBLEMSID: 'problems_id',
  PROBZIP: 'prob_zip',
  PUBLICRESOLUTION: 'public_resolution',
  SRX: 'srx',
  SRY: 'sry',
  STATUS: 'status',
  SUBMITTO: 'submit_to',
  WARD: 'ward',
};

const NUMERIC_COLS = new Set(['srx', 'sry']);

// ---------------------------------------------------------------------------
// DB setup
// ---------------------------------------------------------------------------
function openDb(): Database.Database {
  mkdirSync(join(DB_PATH, '..'), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000');

  db.exec(`
    CREATE TABLE IF NOT EXISTS csb_requests (
      request_id        TEXT PRIMARY KEY,
      caller_type       TEXT,
      city              TEXT,
      date_cancelled    TEXT,
      date_invt_done    TEXT,
      date_time_closed  TEXT,
      date_time_init    TEXT,
      description       TEXT,
      explanation       TEXT,
      grandparent_id    TEXT,
      grandparent_node  TEXT,
      group_name        TEXT,
      neighborhood      TEXT,
      parent_id         TEXT,
      parent_node       TEXT,
      plain_english_name TEXT,
      prj_complete_date TEXT,
      prob_address      TEXT,
      prob_add_type     TEXT,
      problem_code      TEXT,
      problems_id       TEXT,
      prob_zip          TEXT,
      public_resolution TEXT,
      srx               REAL,
      sry               REAL,
      status            TEXT,
      submit_to         TEXT,
      ward              TEXT
    );

    CREATE TABLE IF NOT EXISTS ingested_files (
      filename TEXT PRIMARY KEY,
      row_count INTEGER,
      ingested_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_date_time_init  ON csb_requests (date_time_init);
    CREATE INDEX IF NOT EXISTS idx_neighborhood    ON csb_requests (neighborhood);
    CREATE INDEX IF NOT EXISTS idx_ward            ON csb_requests (ward);
    CREATE INDEX IF NOT EXISTS idx_status          ON csb_requests (status);
    CREATE INDEX IF NOT EXISTS idx_problem_code    ON csb_requests (problem_code);
    CREATE INDEX IF NOT EXISTS idx_group_name      ON csb_requests (group_name);
  `);

  return db;
}

// ---------------------------------------------------------------------------
// Ingest one CSV file
// ---------------------------------------------------------------------------
async function ingestFile(db: Database.Database, filePath: string, fileName: string): Promise<number> {
  const dbCols = Object.values(COLUMN_MAP);
  const placeholders = dbCols.map(() => '?').join(', ');
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO csb_requests (${dbCols.join(', ')}) VALUES (${placeholders})`
  );

  const insertBatch = db.transaction((rows: unknown[][]) => {
    for (const row of rows) stmt.run(row);
  });

  return new Promise((resolve, reject) => {
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    let batch: unknown[][] = [];
    let total = 0;

    parser.on('readable', () => {
      let record: Record<string, string>;
      while ((record = parser.read() as Record<string, string>) !== null) {
        const values = Object.entries(COLUMN_MAP).map(([csvCol, dbCol]) => {
          const raw = record[csvCol] ?? '';
          if (raw === '') return null;
          if (NUMERIC_COLS.has(dbCol)) {
            const n = parseFloat(raw);
            return isNaN(n) ? null : n;
          }
          return raw;
        });

        batch.push(values);
        total++;

        if (batch.length >= BATCH_SIZE) {
          insertBatch(batch);
          batch = [];
          process.stdout.write(`\r  ${fileName}: ${total.toLocaleString()} rows…`);
        }
      }
    });

    parser.on('end', () => {
      if (batch.length > 0) insertBatch(batch);
      process.stdout.write(`\r  ${fileName}: ${total.toLocaleString()} rows — done\n`);
      resolve(total);
    });

    parser.on('error', reject);

    createReadStream(filePath).pipe(parser);
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const db = openDb();

  let files: string[];
  try {
    files = (await readdir(CSV_DIR)).filter((f) => f.toLowerCase().endsWith('.csv')).sort();
  } catch {
    console.error(`Cannot read CSV directory: ${CSV_DIR}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error(`No CSV files found in ${CSV_DIR}`);
    process.exit(1);
  }

  const alreadyIngested = new Set(
    (db.prepare('SELECT filename FROM ingested_files').all() as { filename: string }[]).map(
      (r) => r.filename
    )
  );

  const markIngested = db.prepare(
    'INSERT OR REPLACE INTO ingested_files (filename, row_count) VALUES (?, ?)'
  );

  let grandTotal = 0;
  let skipped = 0;

  console.log(`\nIngesting CSVs from ${CSV_DIR} → ${DB_PATH}`);
  if (YEAR_FROM) console.log(`Filtering to years >= ${YEAR_FROM} (DATA_YEAR_FROM)\n`);
  else console.log();

  for (const file of files) {
    const fileYear = parseInt(file.replace(/\.csv$/i, ''), 10);
    if (YEAR_FROM && !isNaN(fileYear) && fileYear < YEAR_FROM) {
      console.log(`  ${file}: skipped (before DATA_YEAR_FROM=${YEAR_FROM})`);
      skipped++;
      continue;
    }

    if (!FORCE && alreadyIngested.has(file)) {
      console.log(`  ${file}: already ingested (use --force to re-import)`);
      skipped++;
      continue;
    }

    const filePath = join(CSV_DIR, file);
    const fileSize = (await stat(filePath)).size;
    console.log(`  ${file} (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);

    const count = await ingestFile(db, filePath, file);
    markIngested.run(file, count);
    grandTotal += count;
  }

  const totalInDb = (db.prepare('SELECT COUNT(*) as n FROM csb_requests').get() as { n: number }).n;

  console.log(`\nDone. Imported ${grandTotal.toLocaleString()} rows this run.`);
  if (skipped > 0) console.log(`Skipped ${skipped} already-ingested file(s).`);
  console.log(`Total records in database: ${totalInDb.toLocaleString()}`);

  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
