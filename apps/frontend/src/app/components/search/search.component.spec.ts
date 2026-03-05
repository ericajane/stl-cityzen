import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SearchComponent } from './search.component';
import { CsbRequestsService } from '../../services/csb-requests.service';
import type { CsbFilterOptions } from '@org/types';

const mockFilters: CsbFilterOptions = {
  neighborhoods: ['27', '35'],
  wards: ['6', '12'],
  statuses: ['OPEN', 'CLOSED'],
  groups: ['Streets', 'Parks'],
  problemCodes: ['POT', 'GRFF'],
  years: [2025, 2026],
};

describe('SearchComponent', () => {
  let fixture: ComponentFixture<SearchComponent>;
  let component: SearchComponent;
  let mockService: jest.Mocked<Pick<CsbRequestsService, 'getFilterOptions'>>;

  beforeEach(async () => {
    mockService = { getFilterOptions: jest.fn().mockReturnValue(of(mockFilters)) };

    await TestBed.configureTestingModule({
      imports: [SearchComponent],
      providers: [{ provide: CsbRequestsService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads filter options on init', () => {
    expect(mockService.getFilterOptions).toHaveBeenCalled();
    expect(component.filters).toEqual(mockFilters);
  });

  it('has default empty params', () => {
    expect(component.params.keyword).toBe('');
    expect(component.params.neighborhood).toBe('');
    expect(component.params.status).toBe('');
    expect(component.params.year).toBeUndefined();
    expect(component.params.month).toBeUndefined();
  });

  it('has 12 months', () => {
    expect(component.months).toHaveLength(12);
    expect(component.months[0]).toEqual({ value: 1, label: 'January' });
    expect(component.months[11]).toEqual({ value: 12, label: 'December' });
  });

  describe('submit()', () => {
    it('emits current params with page reset to 1', () => {
      const emitted = jest.fn();
      component.paramsChange.subscribe(emitted);
      component.params = { keyword: 'pothole', neighborhood: '27', page: 3, pageSize: 25 };

      component.submit();

      expect(emitted).toHaveBeenCalledWith(expect.objectContaining({ keyword: 'pothole', neighborhood: '27', page: 1 }));
    });

    it('emits year and month when set', () => {
      const emitted = jest.fn();
      component.paramsChange.subscribe(emitted);
      component.params = { ...component.params, year: 2025, month: 6 };

      component.submit();

      expect(emitted).toHaveBeenCalledWith(expect.objectContaining({ year: 2025, month: 6 }));
    });
  });

  describe('reset()', () => {
    it('clears all params and emits', () => {
      const emitted = jest.fn();
      component.paramsChange.subscribe(emitted);
      component.params = { keyword: 'something', neighborhood: '27', year: 2025, month: 3, page: 5, pageSize: 25 };

      component.reset();

      expect(component.params.keyword).toBe('');
      expect(component.params.neighborhood).toBe('');
      expect(component.params.year).toBeUndefined();
      expect(component.params.month).toBeUndefined();
      expect(component.params.page).toBe(1);
      expect(emitted).toHaveBeenCalled();
    });
  });
});
