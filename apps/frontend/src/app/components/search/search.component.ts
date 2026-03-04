import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { CsbFilterOptions, CsbRequestSearchParams } from '@org/types';
import { CsbRequestsService } from '../../services/csb-requests.service';
import { neighborhoodLabel } from '../../constants/neighborhoods';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search.component.html',
})
export class SearchComponent implements OnInit {
  @Output() paramsChange = new EventEmitter<CsbRequestSearchParams>();

  private readonly csbService = inject(CsbRequestsService);

  filters: CsbFilterOptions = {
    neighborhoods: [],
    wards: [],
    statuses: [],
    groups: [],
    problemCodes: [],
    years: [],
  };

  readonly neighborhoodLabel = neighborhoodLabel;

  readonly months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' },   { value: 4, label: 'April' },
    { value: 5, label: 'May' },     { value: 6, label: 'June' },
    { value: 7, label: 'July' },    { value: 8, label: 'August' },
    { value: 9, label: 'September' },{ value: 10, label: 'October' },
    { value: 11, label: 'November' },{ value: 12, label: 'December' },
  ];

  params: CsbRequestSearchParams = {
    keyword: '',
    neighborhood: '',
    ward: '',
    status: '',
    group: '',
    year: undefined,
    month: undefined,
    page: 1,
    pageSize: 25,
  };

  ngOnInit() {
    this.csbService.getFilterOptions().subscribe((f) => (this.filters = f));
  }

  submit() {
    this.paramsChange.emit({ ...this.params, page: 1 });
  }

  reset() {
    this.params = { keyword: '', neighborhood: '', ward: '', status: '', group: '', year: undefined, month: undefined, page: 1, pageSize: 25 };
    this.paramsChange.emit({ ...this.params });
  }
}
