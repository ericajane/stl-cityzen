import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { NeighborhoodMonthlyChartComponent } from './neighborhood-monthly-chart.component';
import { CsbRequestsService } from '../../services/csb-requests.service';
import type { MonthlyCount } from '@org/types';

const mockService = {
  getFilterOptions: jest.fn(),
  getMonthlyStats: jest.fn(),
};

describe('NeighborhoodMonthlyChartComponent', () => {
  let component: NeighborhoodMonthlyChartComponent;
  let fixture: ComponentFixture<NeighborhoodMonthlyChartComponent>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockService.getFilterOptions.mockReturnValue(
      of({ neighborhoods: ['01', '27'], wards: [], statuses: [], groups: [], problemCodes: [], years: [] })
    );

    await TestBed.configureTestingModule({
      imports: [NeighborhoodMonthlyChartComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CsbRequestsService, useValue: mockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NeighborhoodMonthlyChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads neighborhood options on init', () => {
    expect(mockService.getFilterOptions).toHaveBeenCalled();
    expect(component.neighborhoods.length).toBeGreaterThan(0);
  });

  it('clears chart data when no neighborhood is selected', () => {
    component.selectedNeighborhood = '';
    component.onNeighborhoodChange();

    expect(component.monthlyData).toEqual([]);
    expect(component.chartData.datasets).toEqual([]);
  });

  it('fetches and renders chart data for selected neighborhood', () => {
    const stats: MonthlyCount[] = [
      { year: 2025, month: 1, label: 'Jan 2025', count: 10 },
      { year: 2025, month: 2, label: 'Feb 2025', count: 20 },
    ];
    mockService.getMonthlyStats.mockReturnValue(of(stats));

    component.selectedNeighborhood = '27';
    component.onNeighborhoodChange();

    expect(mockService.getMonthlyStats).toHaveBeenCalledWith('27');
    expect(component.monthlyData).toEqual(stats);
    expect(component.chartData.labels).toEqual(['Jan 2025', 'Feb 2025']);
    expect((component.chartData.datasets[0] as { data: number[] }).data).toEqual([10, 20]);
    expect(component.loading).toBe(false);
  });

  it('clears loading state on error', () => {
    mockService.getMonthlyStats.mockReturnValue(throwError(() => new Error('Network error')));

    component.selectedNeighborhood = '27';
    component.loading = true;
    component.onNeighborhoodChange();

    expect(component.loading).toBe(false);
  });

  it('passes the raw neighborhood value (not normalized) to getMonthlyStats', () => {
    mockService.getMonthlyStats.mockReturnValue(of([]));

    component.selectedNeighborhood = '02'; // zero-padded raw value
    component.onNeighborhoodChange();

    expect(mockService.getMonthlyStats).toHaveBeenCalledWith('02');
  });
});
