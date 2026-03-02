import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/** Open311 GeoReport v2 service request shape (St. Louis flavour) */
export interface Open311Request {
  service_request_id: string;
  status: string;
  status_notes?: string;
  service_name?: string;
  service_code?: string;
  description?: string;
  agency_responsible?: string;
  service_notice?: string;
  requested_datetime?: string;
  updated_datetime?: string;
  expected_datetime?: string;
  address?: string;
  address_id?: string;
  zipcode?: string;
  lat?: string | number;
  long?: string | number;
  // St. Louis custom extensions
  HIERARCHY_LEVEL?: number;
  PARENT_SERVICE_CODE?: number;
}

const WINDOW_DAYS = 89; // stay under the 90-day API limit

@Injectable()
export class CsbApiService {
  private readonly logger = new Logger(CsbApiService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.getOrThrow<string>('CSB_API_BASE_URL');
    this.apiKey = this.config.getOrThrow<string>('CSB_API_KEY');
  }

  /**
   * Fetch all service requests between two dates, paginating in 89-day
   * windows to stay within the API's 90-day / 1,000-record limit.
   */
  async fetchSince(from: Date, to: Date = new Date()): Promise<Open311Request[]> {
    const all: Open311Request[] = [];
    let windowStart = new Date(from);

    while (windowStart < to) {
      const windowEnd = new Date(windowStart);
      windowEnd.setDate(windowEnd.getDate() + WINDOW_DAYS);
      if (windowEnd > to) windowEnd.setTime(to.getTime());

      const batch = await this.fetchWindow(windowStart, windowEnd);
      all.push(...batch);

      this.logger.log(
        `Fetched ${batch.length} records for ${fmtDate(windowStart)} → ${fmtDate(windowEnd)}`,
      );

      // Advance to the day after this window
      windowStart = new Date(windowEnd);
      windowStart.setDate(windowStart.getDate() + 1);
    }

    return all;
  }

  private async fetchWindow(start: Date, end: Date): Promise<Open311Request[]> {
    const url = `${this.baseUrl}/requests.json`;
    const params = {
      api_key: this.apiKey,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
    };

    try {
      const response = await firstValueFrom(
        this.http.get<Open311Request[]>(url, { params }),
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`API request failed (${fmtDate(start)}–${fmtDate(end)}): ${msg}`);
      return [];
    }
  }
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
