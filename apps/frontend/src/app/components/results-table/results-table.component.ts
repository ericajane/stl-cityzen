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

  private _result: CsbRequestSearchResult | null = null;

  @Input() set result(val: CsbRequestSearchResult | null) {
    this._result = val;
    this.expandedRows.clear();
  }
  get result(): CsbRequestSearchResult | null { return this._result; }

  @Input() loading = false;
  @Output() pageChange = new EventEmitter<number>();

  expandedRows = new Set<string>();

  get totalPages(): number {
    if (!this._result) return 0;
    return Math.ceil(this._result.total / this._result.pageSize);
  }

  goToPage(page: number) {
    this.pageChange.emit(page);
  }

  trackById(_: number, row: CsbRequest) {
    return row.requestId;
  }

  toggleRow(id: string) {
    if (this.expandedRows.has(id)) {
      this.expandedRows.delete(id);
    } else {
      this.expandedRows.add(id);
    }
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  hasExpandedContent(row: CsbRequest): boolean {
    return !!(
      (row.status === 'CLOSED' && row.dateTimeClosed) ||
      (row.status !== 'CLOSED' && row.prjCompleteDate) ||
      row.publicResolution
    );
  }
}
