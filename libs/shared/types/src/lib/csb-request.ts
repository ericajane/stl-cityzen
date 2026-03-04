export interface CsbRequest {
  requestId: string;
  callerType: string;
  city: string;
  dateCancelled: string | null;
  dateInvtDone: string | null;
  dateTimeClosed: string | null;
  dateTimeInit: string | null;
  description: string;
  explanation: string;
  grandparentId: string;
  grandparentNode: string;
  group: string;
  neighborhood: string;
  parentId: string;
  parentNode: string;
  plainEnglishNameForProblemCode: string;
  prjCompleteDate: string | null;
  probAddress: string;
  probAddType: string;
  problemCode: string;
  problemsId: string;
  probZip: string;
  publicResolution: string;
  srx: number | null;
  sry: number | null;
  status: string;
  submitTo: string;
  ward: string;
}

export interface CsbRequestSearchParams {
  keyword?: string;
  neighborhood?: string;
  ward?: string;
  status?: string;
  group?: string;
  problemCode?: string;
  year?: number;
  month?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface CsbRequestSearchResult {
  data: CsbRequest[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MonthlyCount {
  year: number;
  month: number;
  /** Month label, e.g. "Jan 2024" */
  label: string;
  count: number;
}

export interface CsbFilterOptions {
  neighborhoods: string[];
  wards: string[];
  statuses: string[];
  groups: string[];
  problemCodes: string[];
  years: number[];
}
