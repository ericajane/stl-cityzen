import { Test } from '@nestjs/testing';
import { CsbRequestsController } from './csb-requests.controller';
import { CsbRequestsService } from './csb-requests.service';
import { CsbSyncService } from '../csb-api/csb-sync.service';

const mockSearch = jest.fn();
const mockGetMonthlyStats = jest.fn();
const mockGetFilterOptions = jest.fn();
const mockGetGroupStats = jest.fn();
const mockSync = jest.fn();

describe('CsbRequestsController', () => {
  let controller: CsbRequestsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [CsbRequestsController],
      providers: [
        { provide: CsbRequestsService, useValue: { search: mockSearch, getMonthlyStats: mockGetMonthlyStats, getFilterOptions: mockGetFilterOptions, getGroupStats: mockGetGroupStats } },
        { provide: CsbSyncService, useValue: { sync: mockSync } },
      ],
    }).compile();

    controller = module.get(CsbRequestsController);
  });

  describe('search', () => {
    it('passes string params to service', () => {
      mockSearch.mockReturnValue({ data: [], total: 0, page: 1, pageSize: 25 });

      controller.search('pothole', 'Shaw', '6', 'OPEN', 'Streets', 'POT', 0, 0, undefined, undefined, 1, 25);

      expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({
        keyword: 'pothole',
        neighborhood: 'Shaw',
        ward: '6',
        status: 'OPEN',
        group: 'Streets',
        problemCode: 'POT',
      }));
    });

    it('converts year=0 to undefined', () => {
      mockSearch.mockReturnValue({ data: [], total: 0, page: 1, pageSize: 25 });

      controller.search(undefined, undefined, undefined, undefined, undefined, undefined, 0, 0, undefined, undefined, 1, 25);

      expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({
        year: undefined,
        month: undefined,
      }));
    });

    it('passes non-zero year and month through', () => {
      mockSearch.mockReturnValue({ data: [], total: 0, page: 1, pageSize: 25 });

      controller.search(undefined, undefined, undefined, undefined, undefined, undefined, 2025, 6, undefined, undefined, 1, 25);

      expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({
        year: 2025,
        month: 6,
      }));
    });

    it('caps pageSize at 100', () => {
      mockSearch.mockReturnValue({ data: [], total: 0, page: 1, pageSize: 100 });

      controller.search(undefined, undefined, undefined, undefined, undefined, undefined, 0, 0, undefined, undefined, 1, 9999);

      expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 100 }));
    });

    it('returns the service result directly', () => {
      const mockResult = { data: [{ requestId: 'r1' }], total: 1, page: 1, pageSize: 25 };
      mockSearch.mockReturnValue(mockResult);

      const result = controller.search(undefined, undefined, undefined, undefined, undefined, undefined, 0, 0, undefined, undefined, 1, 25);

      expect(result).toBe(mockResult);
    });
  });

  describe('getMonthlyStats', () => {
    it('delegates to service without neighborhood', () => {
      const stats = [{ year: 2025, month: 3, label: 'Mar 2025', count: 42 }];
      mockGetMonthlyStats.mockReturnValue(stats);

      expect(controller.getMonthlyStats(undefined)).toBe(stats);
      expect(mockGetMonthlyStats).toHaveBeenCalledWith(undefined);
    });

    it('passes neighborhood param to service', () => {
      const stats = [{ year: 2025, month: 3, label: 'Mar 2025', count: 10 }];
      mockGetMonthlyStats.mockReturnValue(stats);

      expect(controller.getMonthlyStats('27')).toBe(stats);
      expect(mockGetMonthlyStats).toHaveBeenCalledWith('27');
    });
  });

  describe('getFilterOptions', () => {
    it('delegates to service', () => {
      const options = { neighborhoods: ['27'], wards: ['6'], statuses: ['OPEN'], groups: [], problemCodes: [], years: [2025] };
      mockGetFilterOptions.mockReturnValue(options);

      expect(controller.getFilterOptions()).toBe(options);
    });
  });

  describe('getGroupStats', () => {
    it('delegates to service with no filters', () => {
      const data = [{ group: 'Streets', count: 10 }];
      mockGetGroupStats.mockReturnValue(data);

      expect(controller.getGroupStats(undefined, 0, 0)).toBe(data);
      expect(mockGetGroupStats).toHaveBeenCalledWith(undefined, undefined, undefined);
    });

    it('passes neighborhood, year, and month to service', () => {
      mockGetGroupStats.mockReturnValue([]);
      controller.getGroupStats('27', 2025, 1);
      expect(mockGetGroupStats).toHaveBeenCalledWith('27', 2025, 1);
    });

    it('converts year=0 and month=0 to undefined', () => {
      mockGetGroupStats.mockReturnValue([]);
      controller.getGroupStats(undefined, 0, 0);
      expect(mockGetGroupStats).toHaveBeenCalledWith(undefined, undefined, undefined);
    });
  });

  describe('sync', () => {
    it('delegates to sync service and returns result', async () => {
      const syncResult = { fetched: 10, upserted: 8, from: '', to: '', durationMs: 200 };
      mockSync.mockResolvedValue(syncResult);

      const result = await controller.sync();
      expect(result).toBe(syncResult);
      expect(mockSync).toHaveBeenCalled();
    });
  });
});
