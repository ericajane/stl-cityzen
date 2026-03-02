import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { CsbRequestsService } from '../../services/csb-requests.service';
import type { MonthlyCount } from '@org/types';

@Component({
  selector: 'app-monthly-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './monthly-chart.component.html',
})
export class MonthlyChartComponent implements OnInit {
  private readonly csbService = inject(CsbRequestsService);

  loading = true;
  monthlyData: MonthlyCount[] = [];

  chartData: ChartData<'bar'> = { labels: [], datasets: [] };

  chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'CSB Requests per Month',
        font: { size: 14 },
      },
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
    },
  };

  ngOnInit() {
    this.csbService.getMonthlyStats().subscribe({
      next: (data) => {
        this.monthlyData = data;
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
