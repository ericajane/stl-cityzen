import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CsbRequestsService } from './csb-requests.service';
import type { CsbRequestSearchResult, CsbFilterOptions, MonthlyCount } from '@org/types';

const BASE = 'http://localhost:3001/api/csb-requests';

describe('CsbRequestsService', () => {
  let service: CsbRequestsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CsbRequestsService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CsbRequestsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('search', () => {
    it('GET /csb-requests with no params', () => {
      const mockResult: CsbRequestSearchResult = { data: [], total: 0, page: 1, pageSize: 25 };
      service.search({ page: 1, pageSize: 25 }).subscribe((r) => expect(r).toEqual(mockResult));

      const req = httpMock.expectOne((r) => r.url === BASE);
      expect(req.request.method).toBe('GET');
      req.flush(mockResult);
    });

    it('sends keyword as a query param', () => {
      service.search({ keyword: 'pothole', page: 1, pageSize: 25 }).subscribe();

      const req = httpMock.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('keyword')).toBe('pothole');
      req.flush({ data: [], total: 0, page: 1, pageSize: 25 });
    });

    it('sends year and month as query params', () => {
      service.search({ year: 2025, month: 6, page: 1, pageSize: 25 }).subscribe();

      const req = httpMock.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('year')).toBe('2025');
      expect(req.request.params.get('month')).toBe('6');
      req.flush({ data: [], total: 0, page: 1, pageSize: 25 });
    });

    it('omits undefined and empty string params', () => {
      service.search({ keyword: '', neighborhood: undefined, page: 1, pageSize: 25 }).subscribe();

      const req = httpMock.expectOne((r) => r.url === BASE);
      expect(req.request.params.has('keyword')).toBe(false);
      expect(req.request.params.has('neighborhood')).toBe(false);
      req.flush({ data: [], total: 0, page: 1, pageSize: 25 });
    });

    it('sends all populated filter params', () => {
      service.search({ keyword: 'kw', neighborhood: '27', ward: '6', status: 'OPEN', group: 'Streets', problemCode: 'POT', page: 2, pageSize: 10 }).subscribe();

      const req = httpMock.expectOne((r) => r.url === BASE);
      const p = req.request.params;
      expect(p.get('keyword')).toBe('kw');
      expect(p.get('neighborhood')).toBe('27');
      expect(p.get('ward')).toBe('6');
      expect(p.get('status')).toBe('OPEN');
      expect(p.get('group')).toBe('Streets');
      expect(p.get('problemCode')).toBe('POT');
      expect(p.get('page')).toBe('2');
      expect(p.get('pageSize')).toBe('10');
      req.flush({ data: [], total: 0, page: 2, pageSize: 10 });
    });
  });

  describe('getMonthlyStats', () => {
    it('GET /csb-requests/stats/monthly', () => {
      const stats: MonthlyCount[] = [{ year: 2025, month: 3, label: 'Mar 2025', count: 42 }];
      service.getMonthlyStats().subscribe((r) => expect(r).toEqual(stats));

      const req = httpMock.expectOne(`${BASE}/stats/monthly`);
      expect(req.request.method).toBe('GET');
      req.flush(stats);
    });
  });

  describe('getFilterOptions', () => {
    it('GET /csb-requests/filters', () => {
      const opts: CsbFilterOptions = { neighborhoods: ['27'], wards: ['6'], statuses: ['OPEN'], groups: ['Streets'], problemCodes: ['POT'], years: [2025] };
      service.getFilterOptions().subscribe((r) => expect(r).toEqual(opts));

      const req = httpMock.expectOne(`${BASE}/filters`);
      expect(req.request.method).toBe('GET');
      req.flush(opts);
    });
  });
});
