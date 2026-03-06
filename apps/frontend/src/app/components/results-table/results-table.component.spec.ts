import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsTableComponent } from './results-table.component';
import type { CsbRequest, CsbRequestSearchResult } from '@org/types';

function makeRequest(overrides: Partial<CsbRequest> = {}): CsbRequest {
  return {
    requestId: 'r1',
    callerType: '',
    city: '',
    dateCancelled: null,
    dateInvtDone: null,
    dateTimeClosed: null,
    dateTimeInit: '2025-03-01T00:00:00.000Z',
    description: 'Test request',
    explanation: '',
    grandparentId: '',
    grandparentNode: '',
    group: 'Streets',
    neighborhood: '27',
    parentId: '',
    parentNode: '',
    plainEnglishNameForProblemCode: 'Pothole',
    prjCompleteDate: null,
    probAddress: '100 Main St',
    probAddType: '',
    problemCode: 'POT',
    problemsId: '',
    probZip: '63101',
    publicResolution: '',
    srx: null,
    sry: null,
    status: 'OPEN',
    submitTo: 'Streets Dept',
    ward: '6',
    ...overrides,
  };
}

function makeResult(overrides: Partial<CsbRequestSearchResult> = {}): CsbRequestSearchResult {
  return { data: [makeRequest()], total: 1, page: 1, pageSize: 25, ...overrides };
}

describe('ResultsTableComponent', () => {
  let fixture: ComponentFixture<ResultsTableComponent>;
  let component: ResultsTableComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultsTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsTableComponent);
    component = fixture.componentInstance;
  });

  describe('totalPages', () => {
    it('returns 0 when result is null', () => {
      component.result = null;
      expect(component.totalPages).toBe(0);
    });

    it('calculates total pages correctly', () => {
      component.result = makeResult({ total: 50, pageSize: 25 });
      expect(component.totalPages).toBe(2);
    });

    it('rounds up for partial last page', () => {
      component.result = makeResult({ total: 51, pageSize: 25 });
      expect(component.totalPages).toBe(3);
    });

    it('returns 1 for results that fit on one page', () => {
      component.result = makeResult({ total: 10, pageSize: 25 });
      expect(component.totalPages).toBe(1);
    });
  });

  describe('goToPage()', () => {
    it('emits the requested page number', () => {
      const emitted = jest.fn();
      component.pageChange.subscribe(emitted);

      component.goToPage(3);

      expect(emitted).toHaveBeenCalledWith(3);
    });
  });

  describe('neighborhoodLabel', () => {
    it('exposes the neighborhoodLabel helper', () => {
      expect(component.neighborhoodLabel('27')).toBe('Shaw (27)');
      expect(component.neighborhoodLabel('35')).toBe('Downtown (35)');
    });

    it('returns empty string for null/undefined', () => {
      expect(component.neighborhoodLabel(null)).toBe('');
      expect(component.neighborhoodLabel(undefined)).toBe('');
    });
  });

  describe('loading state', () => {
    it('shows loading indicator when loading=true', () => {
      component.loading = true;
      component.result = null;
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Loading');
    });

    it('shows empty state when no results', () => {
      component.loading = false;
      component.result = makeResult({ data: [], total: 0 });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('No results found');
    });
  });

  describe('rendering rows', () => {
    beforeEach(() => {
      component.loading = false;
      component.result = makeResult({
        data: [makeRequest({ requestId: 'abc-123', probAddress: '500 Olive St', neighborhood: '35', status: 'CLOSED' })],
        total: 1,
      });
      fixture.detectChanges();
    });

    it('renders the request ID', () => {
      expect(fixture.nativeElement.textContent).toContain('abc-123');
    });

    it('renders the address', () => {
      expect(fixture.nativeElement.textContent).toContain('500 Olive St');
    });

    it('renders the neighborhood name', () => {
      expect(fixture.nativeElement.textContent).toContain('Downtown (35)');
    });

    it('renders the status', () => {
      expect(fixture.nativeElement.textContent).toContain('CLOSED');
    });
  });
});
