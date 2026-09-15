import { baseApi } from '../../services/api.js';
import type { ApiResponse } from '@edusphere/common';
import type {
  IEmployeeHrProfile,
  IEmployeeHrDocument,
  ILeaveType,
  ILeavePolicy,
  ILeaveBalance,
  ILeaveApplication,
  ISalaryComponent,
  ISalaryStructure,
  IEmployeeSalaryAssignment,
  IPayrollPeriod,
  IPayrollItem,
  IPayslip,
  IPayrollAdjustment,
  IOvertimeRecord,
  IHrDashboardKPIs,
  IPayrollDashboardKPIs,
  IDepartmentPayrollSummary,
  ILeaveUtilizationRecord,
} from '@edusphere/types';

export interface LeaveApplicationQueryFilters {
  employeeId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const hrApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // =========================================================================
    // 1. Employee HR & Lifecycle
    // =========================================================================
    getEmployeeHrProfile: builder.query<ApiResponse<IEmployeeHrProfile>, string>({
      query: (employeeId) => ({
        url: `/hr/employees/${employeeId}/hr`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'Employee' as const, id }],
    }),

    updateEmployeeHrProfile: builder.mutation<
      ApiResponse<IEmployeeHrProfile>,
      { employeeId: string; data: any }
    >({
      query: ({ employeeId, data }) => ({
        url: `/hr/employees/${employeeId}/hr`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_res, _err, { employeeId }) => [{ type: 'Employee', id: employeeId }],
    }),

    transitionEmployeeStatus: builder.mutation<
      ApiResponse<IEmployeeHrProfile>,
      { employeeId: string; data: { status: string; reason?: string } }
    >({
      query: ({ employeeId, data }) => ({
        url: `/hr/employees/${employeeId}/transition-status`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_res, _err, { employeeId }) => [{ type: 'Employee', id: employeeId }],
    }),

    uploadHrDocument: builder.mutation<
      ApiResponse<IEmployeeHrDocument>,
      { employeeId: string; data: any }
    >({
      query: ({ employeeId, data }) => ({
        url: `/hr/employees/${employeeId}/documents`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_res, _err, { employeeId }) => [{ type: 'Employee', id: employeeId }],
    }),

    deleteHrDocument: builder.mutation<
      ApiResponse<void>,
      { employeeId: string; documentId: string }
    >({
      query: ({ employeeId, documentId }) => ({
        url: `/hr/employees/${employeeId}/documents/${documentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _err, { employeeId }) => [{ type: 'Employee', id: employeeId }],
    }),

    // =========================================================================
    // 2. Leave Types & Policies
    // =========================================================================
    getLeaveTypes: builder.query<ApiResponse<ILeaveType[]>, void>({
      query: () => ({
        url: '/hr/leave-types',
        method: 'GET',
      }),
      providesTags: (result) =>
        Array.isArray(result?.data)
          ? [
              ...result.data.map((item) => ({
                type: 'LeaveType' as const,
                id: (item as any)._id || item.id,
              })),
              { type: 'LeaveType', id: 'LIST' },
            ]
          : [{ type: 'LeaveType', id: 'LIST' }],
    }),

    createLeaveType: builder.mutation<ApiResponse<ILeaveType>, Partial<ILeaveType>>({
      query: (body) => ({
        url: '/hr/leave-types',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'LeaveType', id: 'LIST' }],
    }),

    updateLeaveType: builder.mutation<
      ApiResponse<ILeaveType>,
      { id: string; data: Partial<ILeaveType> }
    >({
      query: ({ id, data }) => ({
        url: `/hr/leave-types/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'LeaveType', id },
        { type: 'LeaveType', id: 'LIST' },
      ],
    }),

    getLeavePolicies: builder.query<ApiResponse<ILeavePolicy[]>, void>({
      query: () => ({
        url: '/hr/leave-policies',
        method: 'GET',
      }),
      providesTags: (result) =>
        Array.isArray(result?.data)
          ? [
              ...result.data.map((item) => ({
                type: 'LeavePolicy' as const,
                id: (item as any)._id || item.id,
              })),
              { type: 'LeavePolicy', id: 'LIST' },
            ]
          : [{ type: 'LeavePolicy', id: 'LIST' }],
    }),

    createLeavePolicy: builder.mutation<ApiResponse<ILeavePolicy>, any>({
      query: (body) => ({
        url: '/hr/leave-policies',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'LeavePolicy', id: 'LIST' }],
    }),

    updateLeavePolicy: builder.mutation<
      ApiResponse<ILeavePolicy>,
      { id: string; data: any }
    >({
      query: ({ id, data }) => ({
        url: `/hr/leave-policies/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'LeavePolicy', id },
        { type: 'LeavePolicy', id: 'LIST' },
      ],
    }),

    // =========================================================================
    // 3. Leave Balances & Applications
    // =========================================================================
    getEmployeeLeaveBalances: builder.query<ApiResponse<ILeaveBalance[]>, string>({
      query: (employeeId) => ({
        url: `/hr/employees/${employeeId}/leaves/balances`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'LeaveBalance', id }],
    }),

    getMyLeaveBalances: builder.query<ApiResponse<ILeaveBalance[]>, void>({
      query: () => ({
        url: '/hr/leaves/my-balances',
        method: 'GET',
      }),
      providesTags: [{ type: 'LeaveBalance', id: 'MY' }],
    }),

    getLeaveApplications: builder.query<
      ApiResponse<ILeaveApplication[]>,
      LeaveApplicationQueryFilters | void
    >({
      query: (params) => ({
        url: '/hr/leaves/applications',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: [{ type: 'LeaveApplication', id: 'LIST' }],
    }),

    applyForLeave: builder.mutation<
      ApiResponse<ILeaveApplication>,
      { employeeId: string; data: any }
    >({
      query: ({ employeeId, data }) => ({
        url: `/hr/employees/${employeeId}/leaves/apply`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [
        { type: 'LeaveApplication', id: 'LIST' },
        { type: 'LeaveBalance', id: 'LIST' },
      ],
    }),

    reviewLeaveApplication: builder.mutation<
      ApiResponse<ILeaveApplication>,
      { id: string; data: { status: string; remarks?: string } }
    >({
      query: ({ id, data }) => ({
        url: `/hr/leaves/applications/${id}/review`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [
        { type: 'LeaveApplication', id: 'LIST' },
        { type: 'LeaveBalance', id: 'LIST' },
      ],
    }),

    // =========================================================================
    // 4. Salary Components & Structures
    // =========================================================================
    getSalaryComponents: builder.query<ApiResponse<ISalaryComponent[]>, void>({
      query: () => ({
        url: '/hr/salary-components',
        method: 'GET',
      }),
      providesTags: (result) =>
        Array.isArray(result?.data)
          ? [
              ...result.data.map((item) => ({
                type: 'SalaryComponent' as const,
                id: (item as any)._id || item.id,
              })),
              { type: 'SalaryComponent', id: 'LIST' },
            ]
          : [{ type: 'SalaryComponent', id: 'LIST' }],
    }),

    createSalaryComponent: builder.mutation<ApiResponse<ISalaryComponent>, any>({
      query: (body) => ({
        url: '/hr/salary-components',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'SalaryComponent', id: 'LIST' }],
    }),

    updateSalaryComponent: builder.mutation<
      ApiResponse<ISalaryComponent>,
      { id: string; data: any }
    >({
      query: ({ id, data }) => ({
        url: `/hr/salary-components/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'SalaryComponent', id },
        { type: 'SalaryComponent', id: 'LIST' },
      ],
    }),

    getSalaryStructures: builder.query<ApiResponse<ISalaryStructure[]>, void>({
      query: () => ({
        url: '/hr/salary-structures',
        method: 'GET',
      }),
      providesTags: (result) =>
        Array.isArray(result?.data)
          ? [
              ...result.data.map((item) => ({
                type: 'SalaryStructure' as const,
                id: (item as any)._id || item.id,
              })),
              { type: 'SalaryStructure', id: 'LIST' },
            ]
          : [{ type: 'SalaryStructure', id: 'LIST' }],
    }),

    getSalaryStructureById: builder.query<ApiResponse<ISalaryStructure>, string>({
      query: (id) => ({
        url: `/hr/salary-structures/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'SalaryStructure', id }],
    }),

    createSalaryStructure: builder.mutation<ApiResponse<ISalaryStructure>, any>({
      query: (body) => ({
        url: '/hr/salary-structures',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'SalaryStructure', id: 'LIST' }],
    }),

    versionSalaryStructure: builder.mutation<
      ApiResponse<ISalaryStructure>,
      { id: string; data: any }
    >({
      query: ({ id, data }) => ({
        url: `/hr/salary-structures/${id}/version`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'SalaryStructure', id: 'LIST' }],
    }),

    assignSalaryStructure: builder.mutation<
      ApiResponse<IEmployeeSalaryAssignment>,
      { employeeId: string; data: any }
    >({
      query: ({ employeeId, data }) => ({
        url: `/hr/employees/${employeeId}/salary-assignment`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_res, _err, { employeeId }) => [
        { type: 'EmployeeSalaryAssignment', id: employeeId },
      ],
    }),

    getEmployeeSalaryAssignment: builder.query<
      ApiResponse<IEmployeeSalaryAssignment>,
      string
    >({
      query: (employeeId) => ({
        url: `/hr/employees/${employeeId}/salary-assignment`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'EmployeeSalaryAssignment', id }],
    }),

    // =========================================================================
    // 5. Payroll Periods, Runs & Locking
    // =========================================================================
    getPayrollPeriods: builder.query<ApiResponse<IPayrollPeriod[]>, void>({
      query: () => ({
        url: '/hr/payroll-periods',
        method: 'GET',
      }),
      providesTags: (result) =>
        Array.isArray(result?.data)
          ? [
              ...result.data.map((item) => ({
                type: 'PayrollPeriod' as const,
                id: (item as any)._id || item.id,
              })),
              { type: 'PayrollPeriod', id: 'LIST' },
            ]
          : [{ type: 'PayrollPeriod', id: 'LIST' }],
    }),

    getPayrollPeriodById: builder.query<ApiResponse<IPayrollPeriod>, string>({
      query: (id) => ({
        url: `/hr/payroll-periods/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'PayrollPeriod', id }],
    }),

    createPayrollPeriod: builder.mutation<ApiResponse<IPayrollPeriod>, any>({
      query: (body) => ({
        url: '/hr/payroll-periods',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'PayrollPeriod', id: 'LIST' }],
    }),

    calculatePayroll: builder.mutation<
      ApiResponse<IPayrollPeriod>,
      { payrollPeriodId: string; employeeIds?: string[] }
    >({
      query: (body) => ({
        url: '/hr/payroll/calculate',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_res, _err, { payrollPeriodId }) => [
        { type: 'PayrollPeriod', id: payrollPeriodId },
        { type: 'PayrollPeriod', id: 'LIST' },
        { type: 'PayrollItem', id: 'LIST' },
      ],
    }),

    reviewPayrollPeriod: builder.mutation<ApiResponse<IPayrollPeriod>, string>({
      query: (id) => ({
        url: `/hr/payroll-periods/${id}/review`,
        method: 'POST',
      }),
      invalidatesTags: (_res, _err, id) => [
        { type: 'PayrollPeriod', id },
        { type: 'PayrollPeriod', id: 'LIST' },
      ],
    }),

    approvePayrollPeriod: builder.mutation<ApiResponse<IPayrollPeriod>, string>({
      query: (id) => ({
        url: `/hr/payroll-periods/${id}/approve`,
        method: 'POST',
      }),
      invalidatesTags: (_res, _err, id) => [
        { type: 'PayrollPeriod', id },
        { type: 'PayrollPeriod', id: 'LIST' },
      ],
    }),

    processPayrollPeriod: builder.mutation<
      ApiResponse<IPayrollPeriod>,
      { id: string; data?: { paymentMethod?: string; transactionReference?: string } }
    >({
      query: ({ id, data }) => ({
        url: `/hr/payroll-periods/${id}/process`,
        method: 'POST',
        body: data || {},
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'PayrollPeriod', id },
        { type: 'PayrollPeriod', id: 'LIST' },
      ],
    }),

    lockPayrollPeriod: builder.mutation<ApiResponse<IPayrollPeriod>, string>({
      query: (id) => ({
        url: `/hr/payroll-periods/${id}/lock`,
        method: 'POST',
      }),
      invalidatesTags: (_res, _err, id) => [
        { type: 'PayrollPeriod', id },
        { type: 'PayrollPeriod', id: 'LIST' },
      ],
    }),

    getPayrollItems: builder.query<ApiResponse<IPayrollItem[]>, string>({
      query: (periodId) => ({
        url: `/hr/payroll-periods/${periodId}/items`,
        method: 'GET',
      }),
      providesTags: [{ type: 'PayrollItem', id: 'LIST' }],
    }),

    addPayrollAdjustment: builder.mutation<ApiResponse<IPayrollAdjustment>, any>({
      query: (body) => ({
        url: '/hr/payroll/adjustments',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'PayrollPeriod', id: 'LIST' }],
    }),

    reviewPayrollAdjustment: builder.mutation<
      ApiResponse<IPayrollAdjustment>,
      { id: string; data: { status: string } }
    >({
      query: ({ id, data }) => ({
        url: `/hr/payroll/adjustments/${id}/review`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'PayrollPeriod', id: 'LIST' }],
    }),

    recordOvertime: builder.mutation<ApiResponse<IOvertimeRecord>, any>({
      query: (body) => ({
        url: '/hr/payroll/overtime',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'PayrollPeriod', id: 'LIST' }],
    }),

    reviewOvertime: builder.mutation<
      ApiResponse<IOvertimeRecord>,
      { id: string; data: { status: string; approvedHours?: number } }
    >({
      query: ({ id, data }) => ({
        url: `/hr/payroll/overtime/${id}/review`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'PayrollPeriod', id: 'LIST' }],
    }),

    // =========================================================================
    // 6. Payslips
    // =========================================================================
    getPayslipById: builder.query<ApiResponse<IPayslip>, string>({
      query: (id) => ({
        url: `/hr/payslips/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'Payslip', id }],
    }),

    getMyPayslips: builder.query<ApiResponse<IPayslip[]>, void>({
      query: () => ({
        url: '/hr/payslips/my',
        method: 'GET',
      }),
      providesTags: [{ type: 'Payslip', id: 'MY' }],
    }),

    // =========================================================================
    // 7. Dashboards & Analytics
    // =========================================================================
    getHrDashboardKPIs: builder.query<ApiResponse<IHrDashboardKPIs>, void>({
      query: () => ({
        url: '/hr/dashboard/kpis',
        method: 'GET',
      }),
      providesTags: ['HrReport'],
    }),

    getPayrollDashboardKPIs: builder.query<ApiResponse<IPayrollDashboardKPIs>, void>({
      query: () => ({
        url: '/hr/dashboard/payroll-kpis',
        method: 'GET',
      }),
      providesTags: ['HrReport'],
    }),

    getDepartmentPayrollSummary: builder.query<
      ApiResponse<IDepartmentPayrollSummary[]>,
      string | void
    >({
      query: (periodId) => ({
        url: '/hr/reports/department-payroll',
        method: 'GET',
        params: periodId ? { periodId } : undefined,
      }),
      providesTags: ['HrReport'],
    }),

    getLeaveUtilizationReport: builder.query<ApiResponse<ILeaveUtilizationRecord[]>, void>({
      query: () => ({
        url: '/hr/reports/leave-utilization',
        method: 'GET',
      }),
      providesTags: ['HrReport'],
    }),
  }),
});

export const {
  useGetEmployeeHrProfileQuery,
  useUpdateEmployeeHrProfileMutation,
  useTransitionEmployeeStatusMutation,
  useUploadHrDocumentMutation,
  useDeleteHrDocumentMutation,
  useGetLeaveTypesQuery,
  useCreateLeaveTypeMutation,
  useUpdateLeaveTypeMutation,
  useGetLeavePoliciesQuery,
  useCreateLeavePolicyMutation,
  useUpdateLeavePolicyMutation,
  useGetEmployeeLeaveBalancesQuery,
  useGetMyLeaveBalancesQuery,
  useGetLeaveApplicationsQuery,
  useApplyForLeaveMutation,
  useReviewLeaveApplicationMutation,
  useGetSalaryComponentsQuery,
  useCreateSalaryComponentMutation,
  useUpdateSalaryComponentMutation,
  useGetSalaryStructuresQuery,
  useGetSalaryStructureByIdQuery,
  useCreateSalaryStructureMutation,
  useVersionSalaryStructureMutation,
  useAssignSalaryStructureMutation,
  useGetEmployeeSalaryAssignmentQuery,
  useGetPayrollPeriodsQuery,
  useGetPayrollPeriodByIdQuery,
  useCreatePayrollPeriodMutation,
  useCalculatePayrollMutation,
  useReviewPayrollPeriodMutation,
  useApprovePayrollPeriodMutation,
  useProcessPayrollPeriodMutation,
  useLockPayrollPeriodMutation,
  useGetPayrollItemsQuery,
  useAddPayrollAdjustmentMutation,
  useReviewPayrollAdjustmentMutation,
  useRecordOvertimeMutation,
  useReviewOvertimeMutation,
  useGetPayslipByIdQuery,
  useGetMyPayslipsQuery,
  useGetHrDashboardKPIsQuery,
  useGetPayrollDashboardKPIsQuery,
  useGetDepartmentPayrollSummaryQuery,
  useGetLeaveUtilizationReportQuery,
} = hrApi;
