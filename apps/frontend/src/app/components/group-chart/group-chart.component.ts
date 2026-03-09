import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { CsbRequestsService } from '../../services/csb-requests.service';
import { uniqueNeighborhoodOptions } from '../../constants/neighborhoods';
import type { GroupCount } from '@org/types';

@Component({
  selector: 'app-group-chart',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './group-chart.component.html',
})
export class GroupChartComponent implements OnInit {
  private readonly csbService = inject(CsbRequestsService);

  neighborhoods: Array<{ value: string; label: string }> = [];
  years: number[] = [];

  selectedNeighborhood = '';
  selectedYear: number | undefined = undefined;
  selectedMonth: number | undefined = undefined;

  readonly months = [
    { value: 1, label: 'January' },   { value: 2, label: 'February' },
    { value: 3, label: 'March' },     { value: 4, label: 'April' },
    { value: 5, label: 'May' },       { value: 6, label: 'June' },
    { value: 7, label: 'July' },      { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

  loading = false;
  groupData: GroupCount[] = [];

  chartData: ChartData<'bar'> = { labels: [], datasets: [] };

  chartOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'CSB Requests by Problem Type',
        font: { size: 14 },
      },
    },
    scales: {
      x: { beginAtZero: true },
      y: { ticks: { autoSkip: false } },
    },
  };

  ngOnInit() {
    this.csbService.getFilterOptions().subscribe((options) => {
      this.neighborhoods = uniqueNeighborhoodOptions(options.neighborhoods);
      this.years = options.years;
    });
    this.fetchData();
  }

  onFilterChange() {
    // Clear month if year is cleared
    if (!this.selectedYear) this.selectedMonth = undefined;
    this.fetchData();
  }

  private fetchData() {
    this.loading = true;
    this.csbService
      .getGroupStats(
        this.selectedNeighborhood || undefined,
        this.selectedYear,
        this.selectedMonth,
      )
      .subscribe({
        next: (data) => {
          this.groupData = data;
          this.chartData = {
            labels: data.map((d) => d.group),
            datasets: [
              {
                data: data.map((d) => d.count),
                backgroundColor: '#003DA5',
                hoverBackgroundColor: '#C8102E',
                borderRadius: 4,
              },
            ],
          };
          this.loading = false;
        },
        error: () => (this.loading = false),
      });
  }
}
