import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { CsbRequest, CsbRequestSearchResult } from '@org/types';
import { neighborhoodLabel } from '../../constants/neighborhoods';

@Component({
  selector: 'app-results-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './results-table.component.html',
})
export class ResultsTableComponent {
  readonly neighborhoodLabel = neighborhoodLabel;

  @Input() result: CsbRequestSearchResult | null = null;
  @Input() loading = false;
  @Output() pageChange = new EventEmitter<number>();

  get totalPages(): number {
    if (!this.result) return 0;
    return Math.ceil(this.result.total / this.result.pageSize);
  }

  goToPage(page: number) {
    this.pageChange.emit(page);
  }

  trackById(_: number, row: CsbRequest) {
    return row.requestId;
  }
}
