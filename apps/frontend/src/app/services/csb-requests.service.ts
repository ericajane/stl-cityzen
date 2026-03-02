import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  CsbRequestSearchParams,
  CsbRequestSearchResult,
  CsbFilterOptions,
  MonthlyCount,
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

  getMonthlyStats(): Observable<MonthlyCount[]> {
    return this.http.get<MonthlyCount[]>(`${this.base}/stats/monthly`);
  }

  getFilterOptions(): Observable<CsbFilterOptions> {
    return this.http.get<CsbFilterOptions>(`${this.base}/filters`);
  }
}
