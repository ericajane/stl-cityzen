import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  CsbRequestSearchParams,
  CsbRequestSearchResult,
  CsbFilterOptions,
  MonthlyCount,
  GroupCount,
} from '@org/types';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CsbRequestsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/csb-requests`;

  search(params: CsbRequestSearchParams): Observable<CsbRequestSearchResult> {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return this.http.get<CsbRequestSearchResult>(this.base, { params: httpParams });
  }

  getMonthlyStats(neighborhood?: string): Observable<MonthlyCount[]> {
    const params = neighborhood ? new HttpParams().set('neighborhood', neighborhood) : undefined;
    return this.http.get<MonthlyCount[]>(`${this.base}/stats/monthly`, { params });
  }

  getFilterOptions(): Observable<CsbFilterOptions> {
    return this.http.get<CsbFilterOptions>(`${this.base}/filters`);
  }

  getGroupStats(neighborhood?: string, year?: number, month?: number): Observable<GroupCount[]> {
    let params = new HttpParams();
    if (neighborhood) params = params.set('neighborhood', neighborhood);
    if (year)         params = params.set('year', String(year));
    if (month)        params = params.set('month', String(month));
    return this.http.get<GroupCount[]>(`${this.base}/stats/by-group`, { params });
  }
}
