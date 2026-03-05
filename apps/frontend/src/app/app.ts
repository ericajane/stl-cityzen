import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchComponent } from './components/search/search.component';
import { ResultsTableComponent } from './components/results-table/results-table.component';
import { MonthlyChartComponent } from './components/monthly-chart/monthly-chart.component';
import { CsbRequestsService } from './services/csb-requests.service';
import type { CsbRequestSearchParams, CsbRequestSearchResult } from '@org/types';

type Tab = 'search' | 'charts';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, SearchComponent, ResultsTableComponent, MonthlyChartComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly csbService = inject(CsbRequestsService);
  private readonly cdr = inject(ChangeDetectorRef);

  activeTab: Tab = 'search';
  loading = false;
  result: CsbRequestSearchResult | null = null;
  currentParams: CsbRequestSearchParams = { page: 1, pageSize: 25 };

  setTab(tab: Tab) {
    this.activeTab = tab;
  }

  onSearch(params: CsbRequestSearchParams) {
    this.currentParams = params;
    this.fetchResults();
  }

  onPageChange(page: number) {
    this.currentParams = { ...this.currentParams, page };
    this.fetchResults();
  }

  private fetchResults() {
    this.loading = true;
    this.csbService.search(this.currentParams).subscribe({
      next: (r) => {
        this.result = r;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
