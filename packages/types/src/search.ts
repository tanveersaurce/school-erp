export type GlobalSearchEntity =
  | 'STUDENT'
  | 'PARENT'
  | 'STAFF'
  | 'BOOK'
  | 'INVENTORY_ITEM'
  | 'ASSET'
  | 'VEHICLE'
  | 'HOSTEL'
  | 'FEE_INVOICE'
  | 'ANNOUNCEMENT'
  | 'EXAM'
  | 'CLASS';

export interface GlobalSearchResultItem {
  entityType: GlobalSearchEntity;
  entityId: string;
  title: string;
  subtitle?: string;
  matchedField: string;
  route: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface GlobalSearchGroup {
  category: string;
  entityType: GlobalSearchEntity;
  label: string;
  total: number;
  items: GlobalSearchResultItem[];
}

export interface GlobalSearchResponse {
  query: string;
  totalMatches: number;
  groups: GlobalSearchGroup[];
}

export interface GlobalSearchQueryParams {
  q: string;
  limit?: number;
  entities?: GlobalSearchEntity[];
  schoolId?: string;
  campusId?: string;
}
