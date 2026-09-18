import {
  ReportCategory,
  ReportFormat,
} from '@edusphere/common';
import { IReportDefinition } from '@edusphere/types';

export const REPORT_DEFINITIONS: IReportDefinition[] = [
  // ==========================================================================
  // 1. ACADEMIC
  // ==========================================================================
  {
    reportKey: 'academic.class-roster',
    name: 'Class Roster & Enrollment',
    description: 'Detailed class student roster with roll numbers, gender, and enrollment status',
    category: ReportCategory.ACADEMIC,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'academicYearId', label: 'Academic Year', type: 'SELECT', required: false },
      { key: 'classId', label: 'Class / Grade', type: 'SELECT', required: false },
      { key: 'sectionId', label: 'Section', type: 'SELECT', required: false },
      { key: 'status', label: 'Enrollment Status', type: 'SELECT', options: [
        { label: 'Enrolled', value: 'ENROLLED' },
        { label: 'Promoted', value: 'PROMOTED' },
        { label: 'Transferred', value: 'TRANSFERRED' },
        { label: 'Withdrawn', value: 'WITHDRAWN' },
      ]},
    ],
    columns: [
      { id: 'rollNumber', header: 'Roll No', type: 'NUMBER', sortable: true },
      { id: 'admissionNumber', header: 'Admission No', type: 'STRING', sortable: true },
      { id: 'studentName', header: 'Student Name', type: 'STRING', sortable: true },
      { id: 'className', header: 'Class', type: 'STRING' },
      { id: 'sectionName', header: 'Section', type: 'STRING' },
      { id: 'gender', header: 'Gender', type: 'STRING' },
      { id: 'enrollmentStatus', header: 'Status', type: 'STRING' },
      { id: 'parentContact', header: 'Contact', type: 'STRING' },
    ],
    defaultSort: { columnId: 'rollNumber', direction: 'ASC' },
    maxLimit: 2000,
    cacheTtlSeconds: 300,
  },
  {
    reportKey: 'academic.subject-performance',
    name: 'Subject-wise Performance Overview',
    description: 'Subject-wise exam performance averages, highest/lowest scores, and pass percentages',
    category: ReportCategory.ACADEMIC,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'academicYearId', label: 'Academic Year', type: 'SELECT', required: false },
      { key: 'examId', label: 'Exam', type: 'SELECT', required: false },
      { key: 'classId', label: 'Class', type: 'SELECT', required: false },
    ],
    columns: [
      { id: 'subjectName', header: 'Subject', type: 'STRING', sortable: true },
      { id: 'className', header: 'Class', type: 'STRING', sortable: true },
      { id: 'totalStudents', header: 'Students Evaluated', type: 'NUMBER' },
      { id: 'averageScore', header: 'Average Marks', type: 'PERCENTAGE', sortable: true },
      { id: 'highestScore', header: 'Highest Marks', type: 'NUMBER' },
      { id: 'lowestScore', header: 'Lowest Marks', type: 'NUMBER' },
      { id: 'passPercentage', header: 'Pass %', type: 'PERCENTAGE', sortable: true },
    ],
    defaultSort: { columnId: 'averageScore', direction: 'DESC' },
    maxLimit: 1000,
    cacheTtlSeconds: 300,
  },

  // ==========================================================================
  // 2. STUDENTS
  // ==========================================================================
  {
    reportKey: 'students.enrollment-roster',
    name: 'Comprehensive Student Master Roster',
    description: 'Complete student demographic, campus, academic standing, and status listing',
    category: ReportCategory.STUDENTS,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'campusId', label: 'Campus', type: 'SELECT' },
      { key: 'gender', label: 'Gender', type: 'SELECT', options: [
        { label: 'Male', value: 'MALE' },
        { label: 'Female', value: 'FEMALE' },
        { label: 'Other', value: 'OTHER' },
      ]},
      { key: 'status', label: 'Status', type: 'SELECT', options: [
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Inactive', value: 'INACTIVE' },
        { label: 'Alumni', value: 'ALUMNI' },
        { label: 'Suspended', value: 'SUSPENDED' },
      ]},
      { key: 'search', label: 'Search Name/Adm#', type: 'TEXT' },
    ],
    columns: [
      { id: 'admissionNumber', header: 'Admission No', type: 'STRING', sortable: true },
      { id: 'fullName', header: 'Full Name', type: 'STRING', sortable: true },
      { id: 'gender', header: 'Gender', type: 'STRING' },
      { id: 'dateOfBirth', header: 'Date of Birth', type: 'DATE' },
      { id: 'campusName', header: 'Campus', type: 'STRING' },
      { id: 'currentClass', header: 'Class / Grade', type: 'STRING' },
      { id: 'status', header: 'Status', type: 'STRING' },
      { id: 'admissionDate', header: 'Admission Date', type: 'DATE', sortable: true },
    ],
    defaultSort: { columnId: 'admissionNumber', direction: 'ASC' },
    maxLimit: 5000,
    cacheTtlSeconds: 300,
  },
  {
    reportKey: 'students.admissions-funnel',
    name: 'Admissions Funnel & Enrollment Conversion',
    description: 'Breakdown of applications received, reviewed, approved, and registered by academic session',
    category: ReportCategory.STUDENTS,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'academicYearId', label: 'Academic Year', type: 'SELECT' },
      { key: 'dateFrom', label: 'From Date', type: 'DATE' },
      { key: 'dateTo', label: 'To Date', type: 'DATE' },
    ],
    columns: [
      { id: 'stage', header: 'Funnel Stage', type: 'STRING' },
      { id: 'count', header: 'Candidate Count', type: 'NUMBER', sortable: true },
      { id: 'conversionRate', header: 'Conversion Rate %', type: 'PERCENTAGE' },
    ],
    defaultSort: { columnId: 'count', direction: 'DESC' },
    maxLimit: 100,
    cacheTtlSeconds: 600,
  },

  // ==========================================================================
  // 3. ATTENDANCE
  // ==========================================================================
  {
    reportKey: 'attendance.daily-summary',
    name: 'Daily Attendance Summary',
    description: 'Campus and class level daily present, absent, late, and overall attendance percentages',
    category: ReportCategory.ATTENDANCE,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'date', label: 'Attendance Date', type: 'DATE', required: false },
      { key: 'campusId', label: 'Campus', type: 'SELECT' },
      { key: 'classId', label: 'Class', type: 'SELECT' },
    ],
    columns: [
      { id: 'date', header: 'Date', type: 'DATE', sortable: true },
      { id: 'className', header: 'Class', type: 'STRING', sortable: true },
      { id: 'sectionName', header: 'Section', type: 'STRING' },
      { id: 'totalStudents', header: 'Enrolled', type: 'NUMBER' },
      { id: 'presentCount', header: 'Present', type: 'NUMBER' },
      { id: 'absentCount', header: 'Absent', type: 'NUMBER' },
      { id: 'lateCount', header: 'Late', type: 'NUMBER' },
      { id: 'attendanceRate', header: 'Attendance %', type: 'PERCENTAGE', sortable: true },
    ],
    defaultSort: { columnId: 'date', direction: 'DESC' },
    maxLimit: 2000,
    cacheTtlSeconds: 180,
  },
  {
    reportKey: 'attendance.student-defaulters',
    name: 'Chronic Absenteeism & Attendance Defaulters',
    description: 'Students falling below required attendance threshold (e.g. < 75%)',
    category: ReportCategory.ATTENDANCE,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'thresholdPercentage', label: 'Minimum Attendance %', type: 'NUMBER', defaultValue: 75 },
      { key: 'classId', label: 'Class', type: 'SELECT' },
      { key: 'dateFrom', label: 'Start Date', type: 'DATE' },
      { key: 'dateTo', label: 'End Date', type: 'DATE' },
    ],
    columns: [
      { id: 'admissionNumber', header: 'Admission No', type: 'STRING' },
      { id: 'studentName', header: 'Student Name', type: 'STRING', sortable: true },
      { id: 'className', header: 'Class', type: 'STRING' },
      { id: 'sectionName', header: 'Section', type: 'STRING' },
      { id: 'totalWorkingDays', header: 'Total Sessions', type: 'NUMBER' },
      { id: 'attendedDays', header: 'Attended', type: 'NUMBER' },
      { id: 'attendancePercentage', header: 'Attendance %', type: 'PERCENTAGE', sortable: true },
      { id: 'parentPhone', header: 'Guardian Phone', type: 'STRING' },
    ],
    defaultSort: { columnId: 'attendancePercentage', direction: 'ASC' },
    maxLimit: 1500,
    cacheTtlSeconds: 300,
  },

  // ==========================================================================
  // 4. EXAMINATION
  // ==========================================================================
  {
    reportKey: 'examination.schedule-overview',
    name: 'Examination Timetable & Invigilation Schedule',
    description: 'Scheduled examinations, dates, time slots, subject papers, rooms, and supervisors',
    category: ReportCategory.EXAMINATION,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'examId', label: 'Examination', type: 'SELECT' },
      { key: 'classId', label: 'Class', type: 'SELECT' },
      { key: 'dateFrom', label: 'From Date', type: 'DATE' },
      { key: 'dateTo', label: 'To Date', type: 'DATE' },
    ],
    columns: [
      { id: 'examTitle', header: 'Exam Title', type: 'STRING', sortable: true },
      { id: 'subjectName', header: 'Subject', type: 'STRING' },
      { id: 'className', header: 'Class', type: 'STRING' },
      { id: 'examDate', header: 'Date', type: 'DATE', sortable: true },
      { id: 'timeSlot', header: 'Timing', type: 'STRING' },
      { id: 'maxMarks', header: 'Max Marks', type: 'NUMBER' },
      { id: 'passingMarks', header: 'Pass Marks', type: 'NUMBER' },
      { id: 'status', header: 'Status', type: 'STRING' },
    ],
    defaultSort: { columnId: 'examDate', direction: 'ASC' },
    maxLimit: 1000,
    cacheTtlSeconds: 300,
  },

  // ==========================================================================
  // 5. RESULTS
  // ==========================================================================
  {
    reportKey: 'results.grade-distribution',
    name: 'Grade Curve & Result Distribution',
    description: 'Aggregate performance curve across letter grades (A+, A, B, C, F) with pass percentages',
    category: ReportCategory.RESULTS,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'examId', label: 'Exam', type: 'SELECT', required: false },
      { key: 'classId', label: 'Class', type: 'SELECT' },
      { key: 'academicYearId', label: 'Academic Year', type: 'SELECT' },
    ],
    columns: [
      { id: 'grade', header: 'Grade', type: 'STRING', sortable: true },
      { id: 'studentCount', header: 'Students', type: 'NUMBER', sortable: true },
      { id: 'percentageOfClass', header: 'Share %', type: 'PERCENTAGE' },
      { id: 'remark', header: 'Performance Level', type: 'STRING' },
    ],
    defaultSort: { columnId: 'grade', direction: 'ASC' },
    maxLimit: 100,
    cacheTtlSeconds: 300,
  },
  {
    reportKey: 'results.term-report-summary',
    name: 'Student Term Assessment Performance',
    description: 'Individual student performance summary including total score, percentage, GPA, and class rank',
    category: ReportCategory.RESULTS,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'examId', label: 'Exam Term', type: 'SELECT' },
      { key: 'classId', label: 'Class', type: 'SELECT' },
      { key: 'sectionId', label: 'Section', type: 'SELECT' },
    ],
    columns: [
      { id: 'rank', header: 'Rank', type: 'NUMBER', sortable: true },
      { id: 'rollNumber', header: 'Roll No', type: 'NUMBER' },
      { id: 'studentName', header: 'Student Name', type: 'STRING', sortable: true },
      { id: 'totalMarksObtained', header: 'Marks Obtained', type: 'NUMBER' },
      { id: 'totalMaxMarks', header: 'Total Max', type: 'NUMBER' },
      { id: 'percentage', header: 'Percentage %', type: 'PERCENTAGE', sortable: true },
      { id: 'grade', header: 'Overall Grade', type: 'STRING' },
      { id: 'resultStatus', header: 'Result', type: 'STRING' },
    ],
    defaultSort: { columnId: 'rank', direction: 'ASC' },
    maxLimit: 2000,
    cacheTtlSeconds: 300,
  },

  // ==========================================================================
  // 6. FEES
  // ==========================================================================
  {
    reportKey: 'fees.collection-summary',
    name: 'Fee Collection Summary',
    description: 'Consolidated fee collections grouped by payment method, category, and date range',
    category: ReportCategory.FEES,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'dateFrom', label: 'Payment From Date', type: 'DATE' },
      { key: 'dateTo', label: 'Payment To Date', type: 'DATE' },
      { key: 'paymentMethod', label: 'Payment Mode', type: 'SELECT', options: [
        { label: 'Cash', value: 'CASH' },
        { label: 'Card', value: 'CARD' },
        { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
        { label: 'Online / Gateway', value: 'ONLINE_GATEWAY' },
        { label: 'Cheque', value: 'CHEQUE' },
        { label: 'UPI', value: 'UPI' },
      ]},
    ],
    columns: [
      { id: 'paymentDate', header: 'Date', type: 'DATE', sortable: true },
      { id: 'receiptNumber', header: 'Receipt #', type: 'STRING' },
      { id: 'studentName', header: 'Student', type: 'STRING', sortable: true },
      { id: 'className', header: 'Class', type: 'STRING' },
      { id: 'paymentMethod', header: 'Mode', type: 'STRING' },
      { id: 'amountFormatted', header: 'Amount Collected', type: 'MONEY', sortable: true },
      { id: 'status', header: 'Status', type: 'STRING' },
    ],
    defaultSort: { columnId: 'paymentDate', direction: 'DESC' },
    maxLimit: 3000,
    cacheTtlSeconds: 120,
  },
  {
    reportKey: 'fees.defaulters-aging',
    name: 'Fee Defaulters & Dues Aging Analysis',
    description: 'Outstanding uncollected fee balances aged across 30, 60, and 90+ days intervals',
    category: ReportCategory.FEES,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'classId', label: 'Class', type: 'SELECT' },
      { key: 'academicYearId', label: 'Academic Year', type: 'SELECT' },
    ],
    columns: [
      { id: 'admissionNumber', header: 'Admission No', type: 'STRING' },
      { id: 'studentName', header: 'Student Name', type: 'STRING', sortable: true },
      { id: 'className', header: 'Class', type: 'STRING' },
      { id: 'parentPhone', header: 'Parent Phone', type: 'STRING' },
      { id: 'overdue30DaysFormatted', header: '1-30 Days Due', type: 'MONEY' },
      { id: 'overdue60DaysFormatted', header: '31-60 Days Due', type: 'MONEY' },
      { id: 'overdue90PlusFormatted', header: '90+ Days Due', type: 'MONEY' },
      { id: 'totalDueFormatted', header: 'Total Outstanding', type: 'MONEY', sortable: true },
    ],
    defaultSort: { columnId: 'totalDueFormatted', direction: 'DESC' },
    maxLimit: 2000,
    cacheTtlSeconds: 180,
  },

  // ==========================================================================
  // 7. FINANCE
  // ==========================================================================
  {
    reportKey: 'finance.income-expense-statement',
    name: 'Income & Expense Statement',
    description: 'Consolidated statement of institutional revenues and operational expenditures',
    category: ReportCategory.FINANCE,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'dateFrom', label: 'Period From', type: 'DATE' },
      { key: 'dateTo', label: 'Period To', type: 'DATE' },
    ],
    columns: [
      { id: 'date', header: 'Date', type: 'DATE', sortable: true },
      { id: 'type', header: 'Category Type', type: 'STRING', sortable: true },
      { id: 'head', header: 'Account / Head', type: 'STRING' },
      { id: 'description', header: 'Description', type: 'STRING' },
      { id: 'amountFormatted', header: 'Amount', type: 'MONEY', sortable: true },
      { id: 'paymentMode', header: 'Payment Mode', type: 'STRING' },
    ],
    defaultSort: { columnId: 'date', direction: 'DESC' },
    maxLimit: 2500,
    cacheTtlSeconds: 300,
  },
  {
    reportKey: 'finance.balance-sheet-summary',
    name: 'Financial Accounts & Cash Position',
    description: 'Summary of cash balances, bank accounts, and current fiscal positions',
    category: ReportCategory.FINANCE,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'asOfDate', label: 'As Of Date', type: 'DATE' },
    ],
    columns: [
      { id: 'accountName', header: 'Account Name', type: 'STRING', sortable: true },
      { id: 'accountType', header: 'Account Type', type: 'STRING' },
      { id: 'totalCreditsFormatted', header: 'Total Inflow', type: 'MONEY' },
      { id: 'totalDebitsFormatted', header: 'Total Outflow', type: 'MONEY' },
      { id: 'currentBalanceFormatted', header: 'Current Net Position', type: 'MONEY', sortable: true },
    ],
    defaultSort: { columnId: 'currentBalanceFormatted', direction: 'DESC' },
    maxLimit: 200,
    cacheTtlSeconds: 300,
  },

  // ==========================================================================
  // 8. HR
  // ==========================================================================
  {
    reportKey: 'hr.staff-directory',
    name: 'Employee Staff Directory & Headcount',
    description: 'Comprehensive staff list with department, designation, qualifications, and active status',
    category: ReportCategory.HR,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'departmentId', label: 'Department', type: 'SELECT' },
      { key: 'designationId', label: 'Designation', type: 'SELECT' },
      { key: 'status', label: 'Employment Status', type: 'SELECT', options: [
        { label: 'Active', value: 'ACTIVE' },
        { label: 'On Leave', value: 'ON_LEAVE' },
        { label: 'Resigned', value: 'RESIGNED' },
        { label: 'Terminated', value: 'TERMINATED' },
      ]},
    ],
    columns: [
      { id: 'employeeCode', header: 'Staff Code', type: 'STRING', sortable: true },
      { id: 'fullName', header: 'Name', type: 'STRING', sortable: true },
      { id: 'departmentName', header: 'Department', type: 'STRING', sortable: true },
      { id: 'designationName', header: 'Designation', type: 'STRING' },
      { id: 'email', header: 'Email', type: 'STRING' },
      { id: 'phoneNumber', header: 'Phone', type: 'STRING' },
      { id: 'joiningDate', header: 'Joining Date', type: 'DATE' },
      { id: 'status', header: 'Status', type: 'STRING' },
    ],
    defaultSort: { columnId: 'employeeCode', direction: 'ASC' },
    maxLimit: 1500,
    cacheTtlSeconds: 300,
  },
  {
    reportKey: 'hr.leave-utilization',
    name: 'Leave Balances & Utilization',
    description: 'Employee leave allowance, utilized days, and remaining balances by leave category',
    category: ReportCategory.HR,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'departmentId', label: 'Department', type: 'SELECT' },
      { key: 'year', label: 'Leave Year', type: 'NUMBER', defaultValue: 2026 },
    ],
    columns: [
      { id: 'employeeCode', header: 'Code', type: 'STRING' },
      { id: 'employeeName', header: 'Staff Name', type: 'STRING', sortable: true },
      { id: 'departmentName', header: 'Department', type: 'STRING' },
      { id: 'leaveType', header: 'Leave Type', type: 'STRING' },
      { id: 'allocatedDays', header: 'Allocated Days', type: 'NUMBER' },
      { id: 'consumedDays', header: 'Consumed Days', type: 'NUMBER' },
      { id: 'remainingDays', header: 'Remaining Balance', type: 'NUMBER', sortable: true },
    ],
    defaultSort: { columnId: 'employeeName', direction: 'ASC' },
    maxLimit: 2000,
    cacheTtlSeconds: 300,
  },

  // ==========================================================================
  // 9. PAYROLL
  // ==========================================================================
  {
    reportKey: 'payroll.monthly-summary',
    name: 'Monthly Payroll Disbursement Summary',
    description: 'Consolidated staff salary register: gross pay, allowances, deductions, and net disbursed amounts',
    category: ReportCategory.PAYROLL,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'periodId', label: 'Payroll Period', type: 'SELECT' },
      { key: 'month', label: 'Month', type: 'NUMBER' },
      { key: 'year', label: 'Year', type: 'NUMBER', defaultValue: 2026 },
      { key: 'departmentId', label: 'Department', type: 'SELECT' },
    ],
    columns: [
      { id: 'employeeCode', header: 'Staff Code', type: 'STRING' },
      { id: 'employeeName', header: 'Employee Name', type: 'STRING', sortable: true },
      { id: 'departmentName', header: 'Department', type: 'STRING' },
      { id: 'grossPayFormatted', header: 'Gross Earnings', type: 'MONEY' },
      { id: 'totalDeductionsFormatted', header: 'Total Deductions', type: 'MONEY' },
      { id: 'netPayFormatted', header: 'Net Salary', type: 'MONEY', sortable: true },
      { id: 'status', header: 'Disbursement Status', type: 'STRING' },
    ],
    defaultSort: { columnId: 'employeeName', direction: 'ASC' },
    maxLimit: 1500,
    cacheTtlSeconds: 300,
  },

  // ==========================================================================
  // 10. LIBRARY
  // ==========================================================================
  {
    reportKey: 'library.circulation-analytics',
    name: 'Library Circulation & Inventory Analytics',
    description: 'Active book issues, returns, currently borrowed copies, and circulation turnover rates',
    category: ReportCategory.LIBRARY,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'status', label: 'Circulation Status', type: 'SELECT', options: [
        { label: 'Issued / Active', value: 'ISSUED' },
        { label: 'Returned', value: 'RETURNED' },
        { label: 'Overdue', value: 'OVERDUE' },
        { label: 'Lost', value: 'LOST' },
      ]},
      { key: 'dateFrom', label: 'Issue From', type: 'DATE' },
      { key: 'dateTo', label: 'Issue To', type: 'DATE' },
    ],
    columns: [
      { id: 'accessionNumber', header: 'Barcode / Acc No', type: 'STRING' },
      { id: 'bookTitle', header: 'Book Title', type: 'STRING', sortable: true },
      { id: 'author', header: 'Author', type: 'STRING' },
      { id: 'borrowerName', header: 'Borrower', type: 'STRING', sortable: true },
      { id: 'borrowerType', header: 'Member Type', type: 'STRING' },
      { id: 'issuedDate', header: 'Issue Date', type: 'DATE', sortable: true },
      { id: 'dueDate', header: 'Due Date', type: 'DATE', sortable: true },
      { id: 'status', header: 'Status', type: 'STRING' },
    ],
    defaultSort: { columnId: 'dueDate', direction: 'ASC' },
    maxLimit: 2000,
    cacheTtlSeconds: 180,
  },
  {
    reportKey: 'library.overdue-fines',
    name: 'Outstanding Library Fines & Liabilities',
    description: 'Overdue book loans with accumulated late return penalties and unpaid fine balances',
    category: ReportCategory.LIBRARY,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'settled', label: 'Fine Status', type: 'SELECT', options: [
        { label: 'Unpaid Dues', value: 'UNPAID' },
        { label: 'Settled', value: 'SETTLED' },
      ]},
    ],
    columns: [
      { id: 'memberName', header: 'Member Name', type: 'STRING', sortable: true },
      { id: 'memberCode', header: 'Member ID', type: 'STRING' },
      { id: 'bookTitle', header: 'Book Title', type: 'STRING' },
      { id: 'daysOverdue', header: 'Days Overdue', type: 'NUMBER', sortable: true },
      { id: 'fineAmountFormatted', header: 'Fine Assessed', type: 'MONEY', sortable: true },
      { id: 'paidAmountFormatted', header: 'Amount Paid', type: 'MONEY' },
      { id: 'balanceDueFormatted', header: 'Balance Due', type: 'MONEY', sortable: true },
    ],
    defaultSort: { columnId: 'balanceDueFormatted', direction: 'DESC' },
    maxLimit: 1000,
    cacheTtlSeconds: 180,
  },

  // ==========================================================================
  // 11. TRANSPORT
  // ==========================================================================
  {
    reportKey: 'transport.route-occupancy',
    name: 'Bus Route Occupancy & Fleet Utilization',
    description: 'Transport fleet routes, vehicle seating capacity, passenger allocation, and load %',
    category: ReportCategory.TRANSPORT,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'routeId', label: 'Route', type: 'SELECT' },
    ],
    columns: [
      { id: 'routeNumber', header: 'Route #', type: 'STRING', sortable: true },
      { id: 'routeName', header: 'Route Name', type: 'STRING' },
      { id: 'registrationNumber', header: 'Vehicle Reg No', type: 'STRING' },
      { id: 'capacity', header: 'Total Seats', type: 'NUMBER' },
      { id: 'assignedPassengers', header: 'Assigned Students', type: 'NUMBER', sortable: true },
      { id: 'occupancyPercentage', header: 'Occupancy %', type: 'PERCENTAGE', sortable: true },
      { id: 'driverName', header: 'Driver', type: 'STRING' },
    ],
    defaultSort: { columnId: 'occupancyPercentage', direction: 'DESC' },
    maxLimit: 500,
    cacheTtlSeconds: 300,
  },

  // ==========================================================================
  // 12. HOSTEL
  // ==========================================================================
  {
    reportKey: 'hostel.occupancy-status',
    name: 'Hostel Room & Bed Occupancy Register',
    description: 'Residential dorm buildings, room capacities, vacant beds, and boarding occupants',
    category: ReportCategory.HOSTEL,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'hostelId', label: 'Hostel', type: 'SELECT' },
      { key: 'gender', label: 'Hostel Type', type: 'SELECT', options: [
        { label: 'Boys', value: 'BOYS' },
        { label: 'Girls', value: 'GIRLS' },
        { label: 'Co-ed', value: 'COED' },
      ]},
    ],
    columns: [
      { id: 'hostelName', header: 'Hostel Block', type: 'STRING', sortable: true },
      { id: 'roomNumber', header: 'Room No', type: 'STRING', sortable: true },
      { id: 'roomType', header: 'Room Type', type: 'STRING' },
      { id: 'capacity', header: 'Bed Capacity', type: 'NUMBER' },
      { id: 'occupiedBeds', header: 'Occupied Beds', type: 'NUMBER' },
      { id: 'vacantBeds', header: 'Vacant Beds', type: 'NUMBER', sortable: true },
      { id: 'occupancyRate', header: 'Occupancy %', type: 'PERCENTAGE' },
    ],
    defaultSort: { columnId: 'vacantBeds', direction: 'ASC' },
    maxLimit: 1000,
    cacheTtlSeconds: 300,
  },

  // ==========================================================================
  // 13. INVENTORY
  // ==========================================================================
  {
    reportKey: 'inventory.stock-valuation',
    name: 'Inventory Stock Valuation & Reorder Alerts',
    description: 'Current stock quantities on hand, safety stock levels, unit valuations, and shortage flags',
    category: ReportCategory.INVENTORY,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'storeId', label: 'Store / Warehouse', type: 'SELECT' },
      { key: 'reorderOnly', label: 'Below Reorder Point Only', type: 'BOOLEAN' },
    ],
    columns: [
      { id: 'itemCode', header: 'Item Code', type: 'STRING', sortable: true },
      { id: 'itemName', header: 'Item Name', type: 'STRING', sortable: true },
      { id: 'category', header: 'Category', type: 'STRING' },
      { id: 'quantityOnHand', header: 'Quantity On Hand', type: 'NUMBER', sortable: true },
      { id: 'reorderLevel', header: 'Reorder Point', type: 'NUMBER' },
      { id: 'unitCostFormatted', header: 'Unit Cost', type: 'MONEY' },
      { id: 'totalValuationFormatted', header: 'Total Valuation', type: 'MONEY', sortable: true },
      { id: 'needsReorder', header: 'Reorder Status', type: 'STRING' },
    ],
    defaultSort: { columnId: 'totalValuationFormatted', direction: 'DESC' },
    maxLimit: 2000,
    cacheTtlSeconds: 300,
  },

  // ==========================================================================
  // 14. COMMUNICATION
  // ==========================================================================
  {
    reportKey: 'communication.delivery-audit',
    name: 'Notification Delivery Audit & Channels',
    description: 'Multi-channel messaging audit: delivery rates across SMS, Email, Push, and WhatsApp',
    category: ReportCategory.COMMUNICATION,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'dateFrom', label: 'From Date', type: 'DATE' },
      { key: 'dateTo', label: 'To Date', type: 'DATE' },
      { key: 'channel', label: 'Channel', type: 'SELECT', options: [
        { label: 'In-App', value: 'IN_APP' },
        { label: 'Email', value: 'EMAIL' },
        { label: 'SMS', value: 'SMS' },
        { label: 'Push', value: 'PUSH' },
        { label: 'WhatsApp', value: 'WHATSAPP' },
      ]},
    ],
    columns: [
      { id: 'channel', header: 'Channel', type: 'STRING', sortable: true },
      { id: 'totalDispatched', header: 'Dispatched', type: 'NUMBER', sortable: true },
      { id: 'deliveredCount', header: 'Delivered', type: 'NUMBER' },
      { id: 'failedCount', header: 'Failed', type: 'NUMBER' },
      { id: 'pendingCount', header: 'In-Transit', type: 'NUMBER' },
      { id: 'successRate', header: 'Success Rate %', type: 'PERCENTAGE', sortable: true },
    ],
    defaultSort: { columnId: 'totalDispatched', direction: 'DESC' },
    maxLimit: 100,
    cacheTtlSeconds: 180,
  },

  // ==========================================================================
  // 15. SYSTEM
  // ==========================================================================
  {
    reportKey: 'system.audit-log',
    name: 'System Governance & Audit Trail',
    description: 'Comprehensive administrative activity log, critical resource mutations, and security events',
    category: ReportCategory.SYSTEM,
    requiredPermission: 'report:read',
    supportedFormats: [ReportFormat.JSON, ReportFormat.CSV],
    filters: [
      { key: 'dateFrom', label: 'From Date', type: 'DATE' },
      { key: 'dateTo', label: 'To Date', type: 'DATE' },
      { key: 'action', label: 'Action', type: 'TEXT' },
      { key: 'resource', label: 'Resource', type: 'TEXT' },
      { key: 'userId', label: 'Actor User ID', type: 'TEXT' },
    ],
    columns: [
      { id: 'timestamp', header: 'Timestamp', type: 'DATE', sortable: true },
      { id: 'actorName', header: 'User / Actor', type: 'STRING', sortable: true },
      { id: 'action', header: 'Action', type: 'STRING' },
      { id: 'resource', header: 'Resource', type: 'STRING' },
      { id: 'status', header: 'Outcome', type: 'STRING' },
      { id: 'ipAddress', header: 'IP Address', type: 'STRING' },
      { id: 'details', header: 'Audit Details', type: 'STRING' },
    ],
    defaultSort: { columnId: 'timestamp', direction: 'DESC' },
    maxLimit: 5000,
    cacheTtlSeconds: 60,
  },
];

/**
 * Fast lookup map for report definitions
 */
export const REPORT_DEFINITIONS_MAP = new Map<string, IReportDefinition>(
  REPORT_DEFINITIONS.map((def) => [def.reportKey, def])
);
