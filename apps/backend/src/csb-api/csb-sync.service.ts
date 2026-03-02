import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import Database from 'better-sqlite3';
import { DATABASE_TOKEN } from '../database/database.module';
import { CsbApiService, Open311Request } from './csb-api.service';

export interface SyncResult {
  fetched: number;
  upserted: number;
  from: string;
  to: string;
  durationMs: number;
}

@Injectable()
export class CsbSyncService {
  private readonly logger = new Logger(CsbSyncService.name);
  private syncing = false;

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database.Database,
    private readonly apiService: CsbApiService,
  ) {}

  /** Nightly sync at 2 AM local time */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledSync() {
    this.logger.log('Starting scheduled nightly sync…');
    const result = await this.sync();
    this.logger.log(
      `Scheduled sync complete — ${result.upserted} records upserted in ${result.durationMs}ms`,
    );
  }

  async sync(): Promise<SyncResult> {
    if (this.syncing) {
      throw new Error('A sync is already in progress');
    }
    this.syncing = true;
    const start = Date.now();

    try {
      const from = this.getLatestDate();
      const to = new Date();

      this.logger.log(`Syncing from ${from.toISOString()} → ${to.toISOString()}`);

      const records = await this.apiService.fetchSince(from, to);
      const upserted = this.upsertRecords(records);

      return {
        fetched: records.length,
        upserted,
        from: from.toISOString(),
        to: to.toISOString(),
        durationMs: Date.now() - start,
      };
    } finally {
      this.syncing = false;
    }
  }

  /** Returns the date of the most recent record in the DB, defaulting to 30 days ago. */
  private getLatestDate(): Date {
    const row = this.db
      .prepare(
        `SELECT MAX(date_time_init) as latest FROM csb_requests
         WHERE date_time_init IS NOT NULL AND date_time_init != ''`,
      )
      .get() as { latest: string | null };

    if (row?.latest) {
      // Go back 1 day to catch any late-arriving records
      const d = new Date(row.latest);
      d.setDate(d.getDate() - 1);
      return d;
    }

    // No data yet — fetch the last 30 days
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }

  private upsertRecords(records: Open311Request[]): number {
    if (records.length === 0) return 0;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO csb_requests (
        request_id, status, description, plain_english_name,
        problem_code, public_resolution, date_time_init,
        date_time_closed, prj_complete_date, prob_address,
        prob_zip, submit_to, srx, sry
      ) VALUES (
        @request_id, @status, @description, @plain_english_name,
        @problem_code, @public_resolution, @date_time_init,
        @date_time_closed, @prj_complete_date, @prob_address,
        @prob_zip, @submit_to, @srx, @sry
      )
    `);

    const upsertBatch = this.db.transaction((rows: ReturnType<typeof mapRecord>[]) => {
      for (const row of rows) stmt.run(row);
    });

    const mapped = records
      .filter((r) => r.SERVICE_REQUEST_ID)
      .map(mapRecord);

    upsertBatch(mapped);
    return mapped.length;
  }
}

/** Maps an Open311 response record (ALL-CAPS fields) to our SQLite column names. */
function mapRecord(r: Open311Request) {
  return {
    request_id: String(r.SERVICE_REQUEST_ID),
    status: r.STATUS ?? null,
    description: r.DESCRIPTION ?? null,
    plain_english_name: r.SERVICE_NAME ?? null,
    problem_code: r.SERVICE_CODE != null ? String(r.SERVICE_CODE) : null,
    public_resolution: r.STATUS_NOTES ?? null,
    date_time_init: r.REQUESTED_DATETIME ?? null,
    date_time_closed: r.UPDATED_DATETIME ?? null,
    prj_complete_date: r.EXPECTED_DATETIME ?? null,
    prob_address: r.ADDRESS ?? null,
    prob_zip: r.ZIPCODE ?? null,
    submit_to: r.AGENCY_RESPONSIBLE ?? null,
    // Despite the names, LAT = Web Mercator Easting (SRX), LONG = Northing (SRY)
    srx: r.LAT != null ? Number(r.LAT) : null,
    sry: r.LONG != null ? Number(r.LONG) : null,
  };
}
