import { Module, Global } from '@nestjs/common';
import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync } from 'fs';

const DB_PATH =
  process.env['DB_PATH'] ?? join(process.cwd(), 'data', 'csb.db');

export const DATABASE_TOKEN = 'SQLITE_DATABASE';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_TOKEN,
      useFactory: (): Database.Database => {
        // Ensure the data directory exists
        mkdirSync(join(DB_PATH, '..'), { recursive: true });

        const db = new Database(DB_PATH);

        // Performance pragmas
        db.pragma('journal_mode = WAL');
        db.pragma('synchronous = NORMAL');
        db.pragma('cache_size = -64000'); // 64 MB page cache
        db.pragma('foreign_keys = ON');

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

          CREATE INDEX IF NOT EXISTS idx_date_time_init  ON csb_requests (date_time_init);
          CREATE INDEX IF NOT EXISTS idx_neighborhood    ON csb_requests (neighborhood);
          CREATE INDEX IF NOT EXISTS idx_ward            ON csb_requests (ward);
          CREATE INDEX IF NOT EXISTS idx_status          ON csb_requests (status);
          CREATE INDEX IF NOT EXISTS idx_problem_code    ON csb_requests (problem_code);
          CREATE INDEX IF NOT EXISTS idx_group_name      ON csb_requests (group_name);
        `);

        return db;
      },
    },
  ],
  exports: [DATABASE_TOKEN],
})
export class DatabaseModule {}
