export {
  ReportCategory,
  ReportFormat,
  ExportJobStatus,
  ReportScheduleFrequency,
  WidgetType,
} from '@edusphere/common';

import type {
  ReportCategory,
  ReportFormat,
  ExportJobStatus,
  ReportScheduleFrequency,
  WidgetType,
} from '@edusphere/common';

// ============================================================================
// 1. Report Metadata & Definitions
// ============================================================================

export type FilterDataType =
  | 'string'
  | 'number'
  | 'date'
  | 'daterange'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'TEXT'
  | 'NUMBER'
  | 'DATE'
  | 'DATERANGE'
  | 'SELECT'
  | 'MULTISELECT'
  | 'BOOLEAN';

export interface IFilterOption {
  label: string;
  value: string | number | boolean;
}

export interface IReportFilterDefinition {
  key?: string;
  name?: string;
  label: string;
  type: FilterDataType;
  required?: boolean;
  defaultValue?: unknown;
  description?: string;
  options?: IFilterOption[];
  optionsSource?: 'academicYears' | 'schools' | 'campuses' | 'classes' | 'sections' | 'departments';
}

export type ColumnFormat =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'percentage'
  | 'badge'
  | 'boolean'
  | 'STRING'
  | 'NUMBER'
  | 'MONEY'
  | 'DATE'
  | 'PERCENTAGE';

export interface IReportColumnDefinition {
  key?: string;
  id?: string;
  header: string;
  format?: ColumnFormat;
  type?: ColumnFormat | string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
}

export interface IReportDefinition {
  reportKey: string;
  key?: string;
  category: ReportCategory;
  name: string;
  title?: string;
  description: string;
  requiredPermission?: string;
  requiredPermissions?: string[];
  supportedFilters?: IReportFilterDefinition[];
  filters?: IReportFilterDefinition[];
  columns: IReportColumnDefinition[];
  supportedFormats: ReportFormat[];
  defaultSort?: { columnId?: string; field?: string; direction: 'ASC' | 'DESC' | 'asc' | 'desc' };
  isSystem?: boolean;
  isActive?: boolean;
  maxLimit?: number;
  cacheTtlSeconds?: number;
}

// ============================================================================
// 2. Report Execution Query & Results
// ============================================================================

export interface IReportQueryRequest {
  reportKey?: string;
  filters?: Record<string, any>;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC' | 'asc' | 'desc';
  noCache?: boolean;
  bypassCache?: boolean;
  format?: ReportFormat;
}

export interface IReportResult<T = Record<string, any>> {
  reportKey: string;
  reportName?: string;
  category?: ReportCategory;
  definition?: IReportDefinition;
  generatedAt: Date;
  executionDurationMs: number;
  executionTimeMs?: number;
  cached?: boolean;
  page: number;
  limit: number;
  total?: number;
  totalCount?: number;
  totalPages?: number;
  pageCount?: number;
  columns?: IReportColumnDefinition[];
  items?: T[];
  data?: T[];
  summary?: Record<string, any>;
  aggregates?: Record<string, any>;
  appliedFilters?: Record<string, any>;
  filters?: Record<string, any>;
}

// ============================================================================
// 3. User & Role Scope Resolution
// ============================================================================

export interface IReportScope {
  tenantId: string;
  schoolId?: string;
  campusIds?: string[];
  classIds?: string[];
  sectionIds?: string[];
  departmentIds?: string[];
  userId?: string;
  isSuperAdmin?: boolean;
  isSchoolAdmin?: boolean;
  isTeacher?: boolean;
  isParent?: boolean;
  isStudent?: boolean;
  permittedStudentIds?: string[];
}

// ============================================================================
// 4. Asynchronous Report Export Jobs
// ============================================================================

export interface IReportExportJob {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId?: string;
  requestedBy: string;
  reportKey: string;
  filters: Record<string, unknown>;
  format: ReportFormat;
  status: ExportJobStatus;
  progressPercentage: number;
  progress?: number;
  fileReference?: string;
  downloadUrl?: string;
  fileName?: string;
  fileSizeBytes?: number;
  rowCount?: number;
  failureReason?: string;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// 5. Scheduled Reports Configuration
// ============================================================================

export interface IScheduledReport {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId?: string;
  name: string;
  description?: string;
  reportKey: string;
  filters: Record<string, unknown>;
  format: ReportFormat;
  frequency: ReportScheduleFrequency;
  timeOfDay?: string; // e.g. "08:00"
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  recipients: string[]; // email addresses or user IDs
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  lastRunStatus?: 'SUCCESS' | 'FAILED';
  lastRunError?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// 6. Executive Dashboard Overview & Widgets
// ============================================================================

export interface IDashboardKPI {
  id: string;
  label?: string;
  title?: string;
  value: string | number;
  unit?: string;
  formattedValue?: string;
  previousValue?: string | number;
  changePercentage?: number;
  changePercent?: number;
  trend?: 'up' | 'down' | 'neutral' | 'UP' | 'DOWN' | 'NEUTRAL';
  changeDirection?: 'UP' | 'DOWN' | 'NEUTRAL';
  trendPeriod?: string;
  target?: number;
  format?: 'number' | 'currency' | 'percentage' | 'text';
  category: ReportCategory;
  drilldownReportKey?: string;
}

export interface IDashboardWidget {
  id: string;
  title: string;
  type: WidgetType;
  category: ReportCategory;
  data: unknown;
  description?: string;
  refreshIntervalSeconds?: number;
  drilldownReportKey?: string;
}

export interface IDashboardOverview {
  tenantId?: string;
  schoolId?: string;
  academicYearId?: string;
  generatedAt: Date;
  kpis: IDashboardKPI[] | {
    student: {
      total: number;
      active: number;
      newEnrollments: number;
      inactive: number;
    };
    attendance: {
      todayPercentage: number;
      monthlyAveragePercentage: number;
      absentCount: number;
      lowAttendanceCount: number;
    };
    examination: {
      totalExams: number;
      completedExams: number;
      averageScorePercentage: number;
      overallPassPercentage: number;
    };
    finance: {
      totalBilledMinorUnits: number;
      totalCollectedMinorUnits: number;
      totalOutstandingMinorUnits: number;
      collectionPercentage: number;
    };
    hr: {
      totalEmployees: number;
      activeEmployees: number;
      pendingLeavesCount: number;
      payrollStatus: string;
    };
    operations: {
      libraryIssuedBooks: number;
      libraryOverdueBooks: number;
      transportActiveVehicles: number;
      hostelOccupancyPercentage: number;
      inventoryLowStockCount: number;
    };
    communication: {
      totalDispatched: number;
      deliveryRatePercentage: number;
      unreadNotificationsCount: number;
    };
  };
  widgets?: IDashboardWidget[];
  charts?: {
    enrollmentTrend?: Array<{ period: string; count: number }>;
    attendanceTrend?: Array<{ date: string; rate: number }>;
    feeCollectionTrend?: Array<{ month: string; collectedMinorUnits: number; billedMinorUnits: number }>;
  };
}
