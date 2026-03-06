import { Test } from '@nestjs/testing';
import Database from 'better-sqlite3';
import { DATABASE_TOKEN } from '../database/database.module';
import { CsbApiService, Open311Request } from './csb-api.service';
import { CsbSyncService } from './csb-sync.service';

/** Minimal in-memory DB with the csb_requests schema. */
function makeDb(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE csb_requests (
      request_id        TEXT PRIMARY KEY,
      status            TEXT,
      description       TEXT,
      plain_english_name TEXT,
      problem_code      TEXT,
      public_resolution TEXT,
      date_time_init    TEXT,
      date_time_closed  TEXT,
      prj_complete_date TEXT,
      prob_address      TEXT,
      prob_zip          TEXT,
      submit_to         TEXT,
      srx               REAL,
      sry               REAL
    )
  `);
  return db;
}

const makeRecord = (overrides: Partial<Open311Request> = {}): Open311Request => ({
  SERVICE_REQUEST_ID: '123',
  STATUS: 'OPEN',
  SERVICE_NAME: 'Pothole',
  SERVICE_CODE: 'POT',
  DESCRIPTION: 'Big pothole',
  STATUS_NOTES: 'Under review',
  AGENCY_RESPONSIBLE: 'Streets',
  REQUESTED_DATETIME: '2025-03-01T10:00:00.000Z',
  UPDATED_DATETIME: '2025-03-02T10:00:00.000Z',
  EXPECTED_DATETIME: '2025-03-15T10:00:00.000Z',
  ADDRESS: '123 Main St',
  ZIPCODE: '63101',
  LAT: 916000,
  LONG: 4280000,
  ...overrides,
});

describe('CsbSyncService', () => {
  let service: CsbSyncService;
  let db: Database.Database;
  let mockFetchSince: jest.Mock;

  beforeEach(async () => {
    db = makeDb();
    mockFetchSince = jest.fn().mockResolvedValue([]);

    const module = await Test.createTestingModule({
      providers: [
        CsbSyncService,
        { provide: DATABASE_TOKEN, useValue: db },
        { provide: CsbApiService, useValue: { fetchSince: mockFetchSince } },
      ],
    }).compile();

    service = module.get(CsbSyncService);
  });

  afterEach(() => db.close());

  describe('sync', () => {
    it('returns a SyncResult with correct shape', async () => {
      const result = await service.sync();
      expect(result).toMatchObject({
        fetched: 0,
        upserted: 0,
        from: expect.any(String),
        to: expect.any(String),
        durationMs: expect.any(Number),
      });
    });

    it('upserts fetched records into the database', async () => {
      mockFetchSince.mockResolvedValue([makeRecord()]);

      const result = await service.sync();

      expect(result.fetched).toBe(1);
      expect(result.upserted).toBe(1);

      const row = db.prepare('SELECT * FROM csb_requests WHERE request_id = ?').get('123') as Record<string, unknown>;
      expect(row).toBeTruthy();
      expect(row['status']).toBe('OPEN');
      expect(row['plain_english_name']).toBe('Pothole');
    });

    it('maps all Open311 fields to DB columns correctly', async () => {
      mockFetchSince.mockResolvedValue([makeRecord()]);
      await service.sync();

      const row = db.prepare('SELECT * FROM csb_requests WHERE request_id = ?').get('123') as Record<string, unknown>;
      expect(row['request_id']).toBe('123');
      expect(row['status']).toBe('OPEN');
      expect(row['description']).toBe('Big pothole');
      expect(row['plain_english_name']).toBe('Pothole');
      expect(row['problem_code']).toBe('POT');
      expect(row['public_resolution']).toBe('Under review');
      expect(row['date_time_init']).toBe('2025-03-01T10:00:00.000Z');
      expect(row['date_time_closed']).toBe('2025-03-02T10:00:00.000Z');
      expect(row['prj_complete_date']).toBe('2025-03-15T10:00:00.000Z');
      expect(row['prob_address']).toBe('123 Main St');
      expect(row['prob_zip']).toBe('63101');
      expect(row['submit_to']).toBe('Streets');
      expect(row['srx']).toBe(916000);
      expect(row['sry']).toBe(4280000);
    });

    it('maps LAT to srx and LONG to sry (Web Mercator mislabeling)', async () => {
      mockFetchSince.mockResolvedValue([makeRecord({ LAT: 111111, LONG: 222222 })]);
      await service.sync();

      const row = db.prepare('SELECT srx, sry FROM csb_requests WHERE request_id = ?').get('123') as Record<string, unknown>;
      expect(row['srx']).toBe(111111);
      expect(row['sry']).toBe(222222);
    });

    it('stores null for missing optional fields', async () => {
      const minimal: Open311Request = { SERVICE_REQUEST_ID: '999', STATUS: 'OPEN' };
      mockFetchSince.mockResolvedValue([minimal]);
      await service.sync();

      const row = db.prepare('SELECT * FROM csb_requests WHERE request_id = ?').get('999') as Record<string, unknown>;
      expect(row['description']).toBeNull();
      expect(row['srx']).toBeNull();
      expect(row['sry']).toBeNull();
    });

    it('skips records without a SERVICE_REQUEST_ID', async () => {
      mockFetchSince.mockResolvedValue([
        makeRecord({ SERVICE_REQUEST_ID: '' }),
        makeRecord({ SERVICE_REQUEST_ID: '456' }),
      ]);
      const result = await service.sync();
      expect(result.upserted).toBe(1);
    });

    it('upserts (replaces) existing records on re-sync', async () => {
      mockFetchSince.mockResolvedValue([makeRecord({ STATUS: 'OPEN' })]);
      await service.sync();

      mockFetchSince.mockResolvedValue([makeRecord({ STATUS: 'CLOSED' })]);
      await service.sync();

      const row = db.prepare('SELECT status FROM csb_requests WHERE request_id = ?').get('123') as Record<string, unknown>;
      expect(row['status']).toBe('CLOSED');
      expect(db.prepare('SELECT COUNT(*) as n FROM csb_requests').get()).toEqual({ n: 1 });
    });

    it('prevents concurrent syncs', async () => {
      let resolveFetch!: () => void;
      mockFetchSince.mockReturnValue(new Promise<Open311Request[]>((res) => {
        resolveFetch = () => res([]);
      }));

      const first = service.sync();
      await expect(service.sync()).rejects.toThrow('A sync is already in progress');

      resolveFetch();
      await first;
    });

    it('defaults to syncing from 30 days ago when DB is empty', async () => {
      await service.sync();

      const [from] = mockFetchSince.mock.calls[0] as [Date, Date];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Allow ±5 seconds for test execution time
      expect(Math.abs(from.getTime() - thirtyDaysAgo.getTime())).toBeLessThan(5000);
    });

    it('syncs from 1 day before the latest record when data exists', async () => {
      db.prepare(`INSERT INTO csb_requests (request_id, status, date_time_init)
                  VALUES ('old', 'CLOSED', '2025-06-15T00:00:00.000Z')`).run();

      await service.sync();

      const [from] = mockFetchSince.mock.calls[0] as [Date, Date];
      const expected = new Date('2025-06-14T00:00:00.000Z'); // 1 day before
      expect(from.toDateString()).toBe(expected.toDateString());
    });
  });
});
