import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { GroupChartComponent } from './group-chart.component';
import { CsbRequestsService } from '../../services/csb-requests.service';
import type { GroupCount } from '@org/types';

const mockService = {
  getFilterOptions: jest.fn(),
  getGroupStats: jest.fn(),
};

const mockGroups: GroupCount[] = [
  { group: 'Streets', count: 500 },
  { group: 'Animals', count: 300 },
  { group: 'Parks', count: 100 },
];

describe('GroupChartComponent', () => {
  let component: GroupChartComponent;
  let fixture: ComponentFixture<GroupChartComponent>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockService.getFilterOptions.mockReturnValue(
      of({ neighborhoods: ['27'], wards: [], statuses: [], groups: [], problemCodes: [], years: [2025, 2026] })
    );
    mockService.getGroupStats.mockReturnValue(of(mockGroups));

    await TestBed.configureTestingModule({
      imports: [GroupChartComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CsbRequestsService, useValue: mockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GroupChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads filter options and initial data on init', () => {
    expect(mockService.getFilterOptions).toHaveBeenCalled();
    expect(mockService.getGroupStats).toHaveBeenCalledWith(undefined, undefined, undefined);
    expect(component.groupData).toEqual(mockGroups);
  });

  it('renders chart labels and data from response', () => {
    expect(component.chartData.labels).toEqual(['Streets', 'Animals', 'Parks']);
    expect((component.chartData.datasets[0] as { data: number[] }).data).toEqual([500, 300, 100]);
  });

  it('populates year options from filter options', () => {
    expect(component.years).toEqual([2025, 2026]);
  });

  it('re-fetches with neighborhood filter when changed', () => {
    mockService.getGroupStats.mockReturnValue(of(mockGroups));
    component.selectedNeighborhood = '27';
    component.onFilterChange();

    expect(mockService.getGroupStats).toHaveBeenCalledWith('27', undefined, undefined);
  });

  it('re-fetches with year and month filters when set', () => {
    mockService.getGroupStats.mockReturnValue(of(mockGroups));
    component.selectedYear = 2025;
    component.selectedMonth = 3;
    component.onFilterChange();

    expect(mockService.getGroupStats).toHaveBeenCalledWith(undefined, 2025, 3);
  });

  it('clears month when year is cleared', () => {
    mockService.getGroupStats.mockReturnValue(of(mockGroups));
    component.selectedYear = undefined;
    component.selectedMonth = 3;
    component.onFilterChange();

    expect(component.selectedMonth).toBeUndefined();
  });

  it('clears loading on error', () => {
    mockService.getGroupStats.mockReturnValue(throwError(() => new Error('fail')));
    component.loading = true;
    component.onFilterChange();

    expect(component.loading).toBe(false);
  });
});
