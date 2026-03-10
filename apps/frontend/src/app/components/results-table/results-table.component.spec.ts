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

  describe('toggleRow()', () => {
    it('adds a row id to expandedRows', () => {
      component.toggleRow('r1');
      expect(component.expandedRows.has('r1')).toBe(true);
    });

    it('removes a row id from expandedRows when toggled again', () => {
      component.toggleRow('r1');
      component.toggleRow('r1');
      expect(component.expandedRows.has('r1')).toBe(false);
    });

    it('can expand multiple rows simultaneously', () => {
      component.toggleRow('r1');
      component.toggleRow('r2');
      expect(component.expandedRows.has('r1')).toBe(true);
      expect(component.expandedRows.has('r2')).toBe(true);
    });
  });

  describe('result setter', () => {
    it('clears expandedRows when result is set', () => {
      component.toggleRow('r1');
      component.toggleRow('r2');
      component.result = makeResult();
      expect(component.expandedRows.size).toBe(0);
    });

    it('clears expandedRows when result is set to null', () => {
      component.toggleRow('r1');
      component.result = null;
      expect(component.expandedRows.size).toBe(0);
    });
  });

  describe('formatDate()', () => {
    it('returns empty string for null', () => {
      expect(component.formatDate(null)).toBe('');
    });

    it('formats a valid ISO date string', () => {
      expect(component.formatDate('2025-03-15T12:00:00.000Z')).toMatch(/Mar/);
      expect(component.formatDate('2025-03-15T12:00:00.000Z')).toMatch(/2025/);
    });

    it('returns the original string for an invalid date', () => {
      expect(component.formatDate('not-a-date')).toBe('not-a-date');
    });
  });

  describe('hasExpandedContent()', () => {
    it('returns true for CLOSED row with dateTimeClosed', () => {
      const row = makeRequest({ status: 'CLOSED', dateTimeClosed: '2025-04-01T00:00:00.000Z' });
      expect(component.hasExpandedContent(row)).toBe(true);
    });

    it('returns false for CLOSED row without dateTimeClosed', () => {
      const row = makeRequest({ status: 'CLOSED', dateTimeClosed: null, publicResolution: '' });
      expect(component.hasExpandedContent(row)).toBe(false);
    });

    it('returns true for non-CLOSED row with prjCompleteDate', () => {
      const row = makeRequest({ status: 'OPEN', prjCompleteDate: '2025-06-01T00:00:00.000Z' });
      expect(component.hasExpandedContent(row)).toBe(true);
    });

    it('returns false for non-CLOSED row without prjCompleteDate', () => {
      const row = makeRequest({ status: 'OPEN', prjCompleteDate: null, publicResolution: '' });
      expect(component.hasExpandedContent(row)).toBe(false);
    });

    it('returns true when publicResolution is present regardless of status', () => {
      const row = makeRequest({ status: 'OPEN', publicResolution: 'Issue resolved.' });
      expect(component.hasExpandedContent(row)).toBe(true);
    });
  });

  describe('expanded row rendering', () => {
    beforeEach(() => {
      component.loading = false;
    });

    it('shows expanded detail row when row is toggled open', () => {
      component.result = makeResult({
        data: [makeRequest({ requestId: 'r1', status: 'CLOSED', dateTimeClosed: '2025-04-01T00:00:00.000Z' })],
        total: 1,
      });
      fixture.detectChanges();
      component.toggleRow('r1');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Date Closed');
    });

    it('hides expanded detail row when row is toggled closed', () => {
      component.result = makeResult({
        data: [makeRequest({ requestId: 'r1', status: 'CLOSED', dateTimeClosed: '2025-04-01T00:00:00.000Z' })],
        total: 1,
      });
      fixture.detectChanges();
      component.toggleRow('r1');
      fixture.detectChanges();
      component.toggleRow('r1');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('Date Closed');
    });

    it('shows Projected Completion for non-CLOSED row with prjCompleteDate', () => {
      component.result = makeResult({
        data: [makeRequest({ requestId: 'r1', status: 'OPEN', prjCompleteDate: '2025-06-01T00:00:00.000Z' })],
        total: 1,
      });
      fixture.detectChanges();
      component.toggleRow('r1');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Projected Completion');
    });

    it('shows publicResolution when present', () => {
      component.result = makeResult({
        data: [makeRequest({ requestId: 'r1', publicResolution: 'Pothole was filled.' })],
        total: 1,
      });
      fixture.detectChanges();
      component.toggleRow('r1');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Pothole was filled.');
    });

    it('shows fallback message when no expanded content available', () => {
      component.result = makeResult({
        data: [makeRequest({ requestId: 'r1', status: 'OPEN', prjCompleteDate: null, publicResolution: '' })],
        total: 1,
      });
      fixture.detectChanges();
      component.toggleRow('r1');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('No additional details available');
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
