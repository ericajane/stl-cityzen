import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { CsbRequestsService } from '../../services/csb-requests.service';
import { uniqueNeighborhoodOptions, neighborhoodLabel } from '../../constants/neighborhoods';
import type { MonthlyCount } from '@org/types';

@Component({
  selector: 'app-neighborhood-monthly-chart',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './neighborhood-monthly-chart.component.html',
})
export class NeighborhoodMonthlyChartComponent implements OnInit {
  private readonly csbService = inject(CsbRequestsService);

  neighborhoods: Array<{ value: string; label: string }> = [];
  selectedNeighborhood = '';
  loading = false;
  monthlyData: MonthlyCount[] = [];

  chartData: ChartData<'bar'> = { labels: [], datasets: [] };

  chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'CSB Requests by Month',
        font: { size: 14 },
      },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  ngOnInit() {
    this.csbService.getFilterOptions().subscribe((options) => {
      this.neighborhoods = uniqueNeighborhoodOptions(options.neighborhoods);
    });
  }

  onNeighborhoodChange() {
    if (!this.selectedNeighborhood) {
      this.monthlyData = [];
      this.chartData = { labels: [], datasets: [] };
      return;
    }
    this.loading = true;
    this.csbService.getMonthlyStats(this.selectedNeighborhood).subscribe({
      next: (data) => {
        this.monthlyData = data;
        const name = neighborhoodLabel(this.selectedNeighborhood);
        this.chartOptions = {
          ...this.chartOptions,
          plugins: {
            ...this.chartOptions.plugins,
            title: { display: true, text: `CSB Requests by Month — ${name}`, font: { size: 14 } },
          },
        };
        this.chartData = {
          labels: data.map((d) => d.label),
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
