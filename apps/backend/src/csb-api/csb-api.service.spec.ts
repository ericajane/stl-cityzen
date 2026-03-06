import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { CsbApiService, Open311Request } from './csb-api.service';

const mockRecord = (id: string): Open311Request => ({
  SERVICE_REQUEST_ID: id,
  STATUS: 'OPEN',
  REQUESTED_DATETIME: '2025-06-01T00:00:00.000Z',
});

function axiosResponse<T>(data: T): AxiosResponse<T> {
  return { data, status: 200, statusText: 'OK', headers: {}, config: {} as never };
}

describe('CsbApiService', () => {
  let service: CsbApiService;
  let httpGet: jest.Mock;

  beforeEach(async () => {
    httpGet = jest.fn();

    const module = await Test.createTestingModule({
      providers: [
        CsbApiService,
        { provide: HttpService, useValue: { get: httpGet } },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) =>
              key === 'CSB_API_BASE_URL' ? 'https://api.example.com' : 'test-key',
          },
        },
      ],
    }).compile();

    service = module.get(CsbApiService);
  });

  describe('fetchSince', () => {
    it('returns records from a single window when range is under 89 days', async () => {
      const records = [mockRecord('1'), mockRecord('2')];
      httpGet.mockReturnValue(of(axiosResponse(records)));

      const from = new Date('2025-06-01');
      const to = new Date('2025-06-30');
      const result = await service.fetchSince(from, to);

      expect(result).toEqual(records);
      expect(httpGet).toHaveBeenCalledTimes(1);
    });

    it('paginates across multiple 89-day windows', async () => {
      const batch1 = [mockRecord('1')];
      const batch2 = [mockRecord('2')];
      httpGet
        .mockReturnValueOnce(of(axiosResponse(batch1)))
        .mockReturnValueOnce(of(axiosResponse(batch2)));

      const from = new Date('2025-01-01');
      const to = new Date('2025-05-01'); // ~120 days — needs 2 windows

      const result = await service.fetchSince(from, to);

      expect(result).toEqual([...batch1, ...batch2]);
      expect(httpGet).toHaveBeenCalledTimes(2);
    });

    it('returns empty array when range is zero (from === to)', async () => {
      const now = new Date('2025-06-01');
      const result = await service.fetchSince(now, now);
      expect(result).toEqual([]);
      expect(httpGet).not.toHaveBeenCalled();
    });

    it('calls the correct endpoint with api_key, start_date, end_date', async () => {
      httpGet.mockReturnValue(of(axiosResponse([])));

      const from = new Date('2025-06-01T00:00:00.000Z');
      const to = new Date('2025-06-10T00:00:00.000Z');
      await service.fetchSince(from, to);

      expect(httpGet).toHaveBeenCalledWith(
        'https://api.example.com/requests.json',
        expect.objectContaining({
          params: expect.objectContaining({
            api_key: 'test-key',
            start_date: from.toISOString(),
          }),
        }),
      );
    });

    it('returns empty array and continues on HTTP error', async () => {
      httpGet
        .mockReturnValueOnce(throwError(() => new Error('Network error')))
        .mockReturnValueOnce(of(axiosResponse([mockRecord('99')])));

      const from = new Date('2025-01-01');
      const to = new Date('2025-05-01');
      const result = await service.fetchSince(from, to);

      // First window failed (returns []), second window succeeded
      expect(result).toEqual([mockRecord('99')]);
    });

    it('returns empty array when API returns non-array', async () => {
      httpGet.mockReturnValue(of(axiosResponse(null as never)));

      const result = await service.fetchSince(new Date('2025-06-01'), new Date('2025-06-10'));
      expect(result).toEqual([]);
    });
  });
});
