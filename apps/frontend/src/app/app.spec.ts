import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { CsbRequestsService } from './services/csb-requests.service';
import type { CsbRequestSearchResult, CsbFilterOptions, MonthlyCount } from '@org/types';

const emptyResult: CsbRequestSearchResult = { data: [], total: 0, page: 1, pageSize: 25 };
const emptyFilters: CsbFilterOptions = { neighborhoods: [], wards: [], statuses: [], groups: [], problemCodes: [], years: [] };

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let component: App;
  let mockService: jest.Mocked<CsbRequestsService>;

  beforeEach(async () => {
    mockService = {
      search: jest.fn().mockReturnValue(of(emptyResult)),
      getFilterOptions: jest.fn().mockReturnValue(of(emptyFilters)),
      getMonthlyStats: jest.fn().mockReturnValue(of([] as MonthlyCount[])),
    } as unknown as jest.Mocked<CsbRequestsService>;

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: CsbRequestsService, useValue: mockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('tab navigation', () => {
    it('defaults to the search tab', () => {
      expect(component.activeTab).toBe('search');
    });

    it('switches to charts tab', () => {
      component.setTab('charts');
      expect(component.activeTab).toBe('charts');
    });

    it('switches back to search tab', () => {
      component.setTab('charts');
      component.setTab('search');
      expect(component.activeTab).toBe('search');
    });
  });

  describe('onSearch()', () => {
    it('calls the service with the provided params', () => {
      component.onSearch({ keyword: 'pothole', page: 1, pageSize: 25 });
      expect(mockService.search).toHaveBeenCalledWith(expect.objectContaining({ keyword: 'pothole' }));
    });

    it('sets loading to true then false after response', async () => {
      expect(component.loading).toBe(false);
      component.onSearch({ page: 1, pageSize: 25 });
      // loading starts true, then service immediately resolves (of()), so it ends false
      expect(component.loading).toBe(false);
      expect(component.result).toEqual(emptyResult);
    });

    it('stores the search result', () => {
      const mockResult: CsbRequestSearchResult = { data: [], total: 99, page: 1, pageSize: 25 };
      mockService.search.mockReturnValue(of(mockResult));

      component.onSearch({ page: 1, pageSize: 25 });

      expect(component.result).toEqual(mockResult);
    });
  });

  describe('onPageChange()', () => {
    it('updates the page and re-fetches', () => {
      component.currentParams = { keyword: 'test', page: 1, pageSize: 25 };
      component.onPageChange(3);

      expect(mockService.search).toHaveBeenCalledWith(expect.objectContaining({ keyword: 'test', page: 3 }));
    });
  });
});
