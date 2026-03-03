import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import Database from 'better-sqlite3';
import { DATABASE_TOKEN } from '../database/database.module';
import type {
  CsbRequest,
  CsbRequestSearchParams,
  CsbRequestSearchResult,
  CsbFilterOptions,
  MonthlyCount,
} from '@org/types';

/** Maps DB snake_case column names to CsbRequest camelCase fields. */
function rowToRequest(row: Record<string, unknown>): CsbRequest {
  return {
    requestId: row['request_id'] as string,
    callerType: row['caller_type'] as string,
    city: row['city'] as string,
    dateCancelled: (row['date_cancelled'] as string) || null,
    dateInvtDone: (row['date_invt_done'] as string) || null,
    dateTimeClosed: (row['date_time_closed'] as string) || null,
    dateTimeInit: (row['date_time_init'] as string) || null,
    description: row['description'] as string,
    explanation: row['explanation'] as string,
    grandparentId: row['grandparent_id'] as string,
    grandparentNode: row['grandparent_node'] as string,
    group: row['group_name'] as string,
    neighborhood: row['neighborhood'] as string,
    parentId: row['parent_id'] as string,
    parentNode: row['parent_node'] as string,
    plainEnglishNameForProblemCode: row['plain_english_name'] as string,
    prjCompleteDate: (row['prj_complete_date'] as string) || null,
    probAddress: row['prob_address'] as string,
    probAddType: row['prob_add_type'] as string,
    problemCode: row['problem_code'] as string,
    problemsId: row['problems_id'] as string,
    probZip: row['prob_zip'] as string,
    publicResolution: row['public_resolution'] as string,
    status: row['status'] as string,
    submitTo: row['submit_to'] as string,
    ward: row['ward'] as string,
  };
}

@Injectable()
export class CsbRequestsService implements OnModuleInit {
  private readonly logger = new Logger(CsbRequestsService.name);

  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database.Database) {}

  onModuleInit() {
    const result = this.db
      .prepare('SELECT COUNT(*) as n FROM csb_requests')
      .get() as { n: number };
    this.logger.log(
      result.n > 0
        ? `SQLite ready — ${result.n.toLocaleString()} records`
        : 'SQLite ready — database is empty. Run: npx nx run backend:ingest',
    );
  }

  search(params: CsbRequestSearchParams): CsbRequestSearchResult {
    const {
      keyword,
      neighborhood,
      ward,
      status,
      group,
      problemCode,
      dateFrom,
      dateTo,
      page = 1,
      pageSize = 25,
    } = params;

    const conditions: string[] = [];
    const bindings: unknown[] = [];

    if (keyword) {
      conditions.push(`(
        description       LIKE ? OR
        plain_english_name LIKE ? OR
        prob_address      LIKE ? OR
        public_resolution LIKE ? OR
        request_id        LIKE ?
      )`);
      const kw = `%${keyword}%`;
      bindings.push(kw, kw, kw, kw, kw);
    }
    if (neighborhood) { conditions.push('neighborhood = ?'); bindings.push(neighborhood); }
    if (ward)         { conditions.push('ward = ?');         bindings.push(ward); }
    if (status)       { conditions.push('status = ?');       bindings.push(status); }
    if (group)        { conditions.push('group_name = ?');   bindings.push(group); }
    if (problemCode)  { conditions.push('problem_code = ?'); bindings.push(problemCode); }
    if (dateFrom)     { conditions.push('date_time_init >= ?'); bindings.push(dateFrom); }
    if (dateTo)       { conditions.push('date_time_init <= ?'); bindings.push(dateTo); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;

    const total = (
      this.db.prepare(`SELECT COUNT(*) as n FROM csb_requests ${where}`).get(...bindings) as { n: number }
    ).n;

    const rows = this.db
      .prepare(
        `SELECT * FROM csb_requests ${where}
         ORDER BY date_time_init DESC
         LIMIT ? OFFSET ?`,
      )
      .all(...bindings, pageSize, offset) as Record<string, unknown>[];

    return { data: rows.map(rowToRequest), total, page, pageSize };
  }

  getMonthlyStats(): MonthlyCount[] {
    const rows = this.db
      .prepare(`
        SELECT
          CAST(strftime('%Y', date_time_init) AS INTEGER) AS year,
          CAST(strftime('%m', date_time_init) AS INTEGER) AS month,
          COUNT(*) AS count
        FROM csb_requests
        WHERE date_time_init IS NOT NULL AND date_time_init != ''
        GROUP BY year, month
        ORDER BY year, month
      `)
      .all() as { year: number; month: number; count: number }[];

    return rows.map(({ year, month, count }) => ({
      year,
      month,
      label: new Date(year, month - 1).toLocaleString('en-US', {
        month: 'short',
        year: 'numeric',
      }),
      count,
    }));
  }

  getFilterOptions(): CsbFilterOptions {
    const distinct = (col: string): string[] =>
      (
        this.db
          .prepare(
            `SELECT DISTINCT ${col} FROM csb_requests
             WHERE ${col} IS NOT NULL AND ${col} != ''
             ORDER BY ${col}`,
          )
          .all() as Record<string, string>[]
      ).map((r) => r[col]);

    return {
      neighborhoods: distinct('neighborhood'),
      wards: distinct('ward'),
      statuses: distinct('status'),
      groups: distinct('group_name'),
      problemCodes: distinct('problem_code'),
    };
  }
}
