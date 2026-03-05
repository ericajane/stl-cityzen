import Database from 'better-sqlite3';
import { Test } from '@nestjs/testing';
import { DATABASE_TOKEN } from '../database/database.module';
import { CsbRequestsService } from './csb-requests.service';

function makeDb(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE csb_requests (
      request_id         TEXT PRIMARY KEY,
      caller_type        TEXT,
      city               TEXT,
      date_cancelled     TEXT,
      date_invt_done     TEXT,
      date_time_closed   TEXT,
      date_time_init     TEXT,
      description        TEXT,
      explanation        TEXT,
      grandparent_id     TEXT,
      grandparent_node   TEXT,
      group_name         TEXT,
      neighborhood       TEXT,
      parent_id          TEXT,
      parent_node        TEXT,
      plain_english_name TEXT,
      prj_complete_date  TEXT,
      prob_address       TEXT,
      prob_add_type      TEXT,
      problem_code       TEXT,
      problems_id        TEXT,
      prob_zip           TEXT,
      public_resolution  TEXT,
      srx                REAL,
      sry                REAL,
      status             TEXT,
      submit_to          TEXT,
      ward               TEXT
    )
  `);
  return db;
}

function insertRow(db: Database.Database, overrides: Record<string, unknown> = {}) {
  const defaults = {
    request_id: `req-${Math.random()}`,
    status: 'OPEN',
    description: 'Test request',
    plain_english_name: 'Pothole',
    problem_code: 'POT',
    neighborhood: '27',
    ward: '6',
    group_name: 'Streets',
    date_time_init: '2025-03-01T10:00:00.000Z',
    prob_address: '100 Main St',
    public_resolution: null,
    srx: null,
    sry: null,
  };
  const row = { ...defaults, ...overrides };
  db.prepare(
    `INSERT INTO csb_requests (${Object.keys(row).join(', ')})
     VALUES (${Object.keys(row).map(() => '?').join(', ')})`,
  ).run(Object.values(row));
  return row;
}

describe('CsbRequestsService', () => {
  let service: CsbRequestsService;
  let db: Database.Database;

  beforeEach(async () => {
    db = makeDb();

    const module = await Test.createTestingModule({
      providers: [
        CsbRequestsService,
        { provide: DATABASE_TOKEN, useValue: db },
      ],
    }).compile();

    service = module.get(CsbRequestsService);
  });

  afterEach(() => db.close());

  describe('search', () => {
    it('returns all records when no filters applied', () => {
      insertRow(db, { request_id: 'r1' });
      insertRow(db, { request_id: 'r2' });

      const result = service.search({ page: 1, pageSize: 25 });
      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
    });

    it('filters by keyword in description', () => {
      insertRow(db, { request_id: 'r1', description: 'Large pothole on Broadway', plain_english_name: 'Street Issue' });
      insertRow(db, { request_id: 'r2', description: 'Broken streetlight', plain_english_name: 'Light Repair' });

      const result = service.search({ keyword: 'pothole', page: 1, pageSize: 25 });
      expect(result.total).toBe(1);
      expect(result.data[0].requestId).toBe('r1');
    });

    it('filters by keyword in prob_address', () => {
      insertRow(db, { request_id: 'r1', prob_address: '500 Broadway' });
      insertRow(db, { request_id: 'r2', prob_address: '200 Oak St' });

      const result = service.search({ keyword: 'Broadway', page: 1, pageSize: 25 });
      expect(result.total).toBe(1);
    });

    it('filters by keyword in request_id', () => {
      insertRow(db, { request_id: 'ABC-001' });
      insertRow(db, { request_id: 'XYZ-999' });

      const result = service.search({ keyword: 'ABC', page: 1, pageSize: 25 });
      expect(result.total).toBe(1);
      expect(result.data[0].requestId).toBe('ABC-001');
    });

    it('filters by neighborhood', () => {
      insertRow(db, { request_id: 'r1', neighborhood: '27' });
      insertRow(db, { request_id: 'r2', neighborhood: '15' });

      const result = service.search({ neighborhood: '27', page: 1, pageSize: 25 });
      expect(result.total).toBe(1);
      expect(result.data[0].neighborhood).toBe('27');
    });

    it('filters by ward', () => {
      insertRow(db, { request_id: 'r1', ward: '6' });
      insertRow(db, { request_id: 'r2', ward: '12' });

      const result = service.search({ ward: '6', page: 1, pageSize: 25 });
      expect(result.total).toBe(1);
    });

    it('filters by status', () => {
      insertRow(db, { request_id: 'r1', status: 'OPEN' });
      insertRow(db, { request_id: 'r2', status: 'CLOSED' });

      const result = service.search({ status: 'CLOSED', page: 1, pageSize: 25 });
      expect(result.total).toBe(1);
      expect(result.data[0].status).toBe('CLOSED');
    });

    it('filters by group', () => {
      insertRow(db, { request_id: 'r1', group_name: 'Streets' });
      insertRow(db, { request_id: 'r2', group_name: 'Parks' });

      const result = service.search({ group: 'Parks', page: 1, pageSize: 25 });
      expect(result.total).toBe(1);
    });

    it('filters by problemCode', () => {
      insertRow(db, { request_id: 'r1', problem_code: 'POT' });
      insertRow(db, { request_id: 'r2', problem_code: 'GRFF' });

      const result = service.search({ problemCode: 'GRFF', page: 1, pageSize: 25 });
      expect(result.total).toBe(1);
    });

    it('filters by year', () => {
      insertRow(db, { request_id: 'r1', date_time_init: '2025-06-01T00:00:00.000Z' });
      insertRow(db, { request_id: 'r2', date_time_init: '2024-06-01T00:00:00.000Z' });

      const result = service.search({ year: 2025, page: 1, pageSize: 25 });
      expect(result.total).toBe(1);
      expect(result.data[0].requestId).toBe('r1');
    });

    it('filters by month', () => {
      insertRow(db, { request_id: 'r1', date_time_init: '2025-03-15T00:00:00.000Z' });
      insertRow(db, { request_id: 'r2', date_time_init: '2025-07-01T00:00:00.000Z' });

      const result = service.search({ month: 3, page: 1, pageSize: 25 });
      expect(result.total).toBe(1);
      expect(result.data[0].requestId).toBe('r1');
    });

    it('filters by dateFrom', () => {
      insertRow(db, { request_id: 'r1', date_time_init: '2025-06-01T00:00:00.000Z' });
      insertRow(db, { request_id: 'r2', date_time_init: '2025-01-01T00:00:00.000Z' });

      const result = service.search({ dateFrom: '2025-05-01', page: 1, pageSize: 25 });
      expect(result.total).toBe(1);
    });

    it('filters by dateTo', () => {
      insertRow(db, { request_id: 'r1', date_time_init: '2025-01-01T00:00:00.000Z' });
      insertRow(db, { request_id: 'r2', date_time_init: '2025-12-01T00:00:00.000Z' });

      const result = service.search({ dateTo: '2025-06-01', page: 1, pageSize: 25 });
      expect(result.total).toBe(1);
    });

    it('combines multiple filters', () => {
      insertRow(db, { request_id: 'r1', status: 'OPEN', ward: '6', description: 'pothole', plain_english_name: 'Road' });
      insertRow(db, { request_id: 'r2', status: 'OPEN', ward: '6', description: 'graffiti', plain_english_name: 'Graffiti' });
      insertRow(db, { request_id: 'r3', status: 'CLOSED', ward: '6', description: 'pothole', plain_english_name: 'Road' });

      const result = service.search({ keyword: 'pothole', status: 'OPEN', ward: '6', page: 1, pageSize: 25 });
      expect(result.total).toBe(1);
      expect(result.data[0].requestId).toBe('r1');
    });

    it('paginates results correctly', () => {
      for (let i = 1; i <= 5; i++) {
        insertRow(db, { request_id: `r${i}`, date_time_init: `2025-0${i}-01T00:00:00.000Z` });
      }

      const page1 = service.search({ page: 1, pageSize: 2 });
      const page2 = service.search({ page: 2, pageSize: 2 });
      const page3 = service.search({ page: 3, pageSize: 2 });

      expect(page1.total).toBe(5);
      expect(page1.data).toHaveLength(2);
      expect(page2.data).toHaveLength(2);
      expect(page3.data).toHaveLength(1);
    });

    it('returns empty result when no records match', () => {
      insertRow(db, { request_id: 'r1', status: 'OPEN' });

      const result = service.search({ status: 'CLOSED', page: 1, pageSize: 25 });
      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });

    it('maps DB columns to camelCase CsbRequest fields', () => {
      insertRow(db, {
        request_id: 'map-test',
        plain_english_name: 'Graffiti Removal',
        prob_address: '500 Olive St',
        neighborhood: '35',
        ward: '7',
        status: 'CLOSED',
        date_time_init: '2025-04-01T00:00:00.000Z',
      });

      const result = service.search({ page: 1, pageSize: 25 });
      const row = result.data[0];

      expect(row.requestId).toBe('map-test');
      expect(row.plainEnglishNameForProblemCode).toBe('Graffiti Removal');
      expect(row.probAddress).toBe('500 Olive St');
      expect(row.neighborhood).toBe('35');
      expect(row.ward).toBe('7');
      expect(row.status).toBe('CLOSED');
      expect(row.dateTimeInit).toBe('2025-04-01T00:00:00.000Z');
    });
  });

  describe('getMonthlyStats', () => {
    it('returns monthly counts grouped by year and month', () => {
      insertRow(db, { request_id: 'r1', date_time_init: '2025-01-10T00:00:00.000Z' });
      insertRow(db, { request_id: 'r2', date_time_init: '2025-01-20T00:00:00.000Z' });
      insertRow(db, { request_id: 'r3', date_time_init: '2025-03-05T00:00:00.000Z' });

      const stats = service.getMonthlyStats();

      expect(stats).toHaveLength(2);
      expect(stats[0]).toMatchObject({ year: 2025, month: 1, count: 2 });
      expect(stats[1]).toMatchObject({ year: 2025, month: 3, count: 1 });
    });

    it('includes a human-readable label', () => {
      insertRow(db, { request_id: 'r1', date_time_init: '2025-06-01T00:00:00.000Z' });

      const stats = service.getMonthlyStats();
      expect(stats[0].label).toMatch(/Jun.+2025/);
    });

    it('excludes records with null or empty date_time_init', () => {
      insertRow(db, { request_id: 'r1', date_time_init: null });
      insertRow(db, { request_id: 'r2', date_time_init: '' });
      insertRow(db, { request_id: 'r3', date_time_init: '2025-06-01T00:00:00.000Z' });

      const stats = service.getMonthlyStats();
      expect(stats).toHaveLength(1);
    });

    it('returns empty array when table is empty', () => {
      expect(service.getMonthlyStats()).toEqual([]);
    });
  });

  describe('getFilterOptions', () => {
    it('returns distinct values for all filterable fields', () => {
      insertRow(db, { request_id: 'r1', neighborhood: '27', ward: '6', status: 'OPEN', group_name: 'Streets', problem_code: 'POT', date_time_init: '2025-03-01T00:00:00.000Z' });
      insertRow(db, { request_id: 'r2', neighborhood: '15', ward: '12', status: 'CLOSED', group_name: 'Parks', problem_code: 'GRFF', date_time_init: '2025-06-01T00:00:00.000Z' });

      const options = service.getFilterOptions();

      expect(options.neighborhoods).toEqual(expect.arrayContaining(['15', '27']));
      expect(options.wards).toEqual(expect.arrayContaining(['12', '6']));
      expect(options.statuses).toEqual(expect.arrayContaining(['CLOSED', 'OPEN']));
      expect(options.groups).toEqual(expect.arrayContaining(['Parks', 'Streets']));
      expect(options.problemCodes).toEqual(expect.arrayContaining(['GRFF', 'POT']));
      expect(options.years).toEqual(expect.arrayContaining([2025]));
    });

    it('excludes null and empty values', () => {
      insertRow(db, { request_id: 'r1', neighborhood: null, ward: '', status: 'OPEN', group_name: 'Streets', problem_code: 'POT', date_time_init: '2025-01-01T00:00:00.000Z' });

      const options = service.getFilterOptions();

      expect(options.neighborhoods).toEqual([]);
      expect(options.wards).toEqual([]);
    });

    it('returns years in descending order', () => {
      insertRow(db, { request_id: 'r1', date_time_init: '2024-01-01T00:00:00.000Z' });
      insertRow(db, { request_id: 'r2', date_time_init: '2026-01-01T00:00:00.000Z' });
      insertRow(db, { request_id: 'r3', date_time_init: '2025-01-01T00:00:00.000Z' });

      const options = service.getFilterOptions();

      expect(options.years).toEqual([2026, 2025, 2024]);
    });
  });
});
