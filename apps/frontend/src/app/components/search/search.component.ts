import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { CsbFilterOptions, CsbRequestSearchParams } from '@org/types';
import { CsbRequestsService } from '../../services/csb-requests.service';

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
  };

  params: CsbRequestSearchParams = {
    keyword: '',
    neighborhood: '',
    ward: '',
    status: '',
    group: '',
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
    this.params = { keyword: '', neighborhood: '', ward: '', status: '', group: '', page: 1, pageSize: 25 };
    this.paramsChange.emit({ ...this.params });
  }
}
