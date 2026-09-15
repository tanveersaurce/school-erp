import { baseApi } from '../../services/api.js';
import type { ApiResponse } from '@edusphere/common';
import type {
  IFeeCategory,
  IFeeStructure,
  IStudentFeeAssignment,
  IFeeInvoice,
  IPayment,
  IRefund,
  IIncome,
  IExpense,
  IFinanceSummaryKPIs,
  IDefaulterRecord,
  IStudentLedgerStatement,
} from '@edusphere/types';

export interface FeeCategoryQueryFilters {
  search?: string;
  type?: string;
  campusId?: string;
  isActive?: boolean;
}

export interface FeeStructureQueryFilters {
  academicYearId?: string;
  campusId?: string;
  academicClassId?: string;
  frequency?: string;
  isActive?: boolean;
}

export interface FeeInvoiceQueryFilters {
  studentId?: string;
  academicClassId?: string;
  academicYearId?: string;
  campusId?: string;
  status?: string;
  invoiceNumber?: string;
  page?: number;
  limit?: number;
}

export interface PaymentQueryFilters {
  invoiceId?: string;
  studentId?: string;
  paymentMethod?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface RefundQueryFilters {
  paymentId?: string;
  studentId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface IncomeExpenseQueryFilters {
  category?: string;
  campusId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const financeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // =========================================================================
    // 1. Fee Categories
    // =========================================================================
    getFeeCategories: builder.query<ApiResponse<IFeeCategory[]>, FeeCategoryQueryFilters | void>({
      query: (params) => ({
        url: '/finance/fee-categories',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'FeeCategory' as const, id })),
              { type: 'FeeCategory', id: 'LIST' },
            ]
          : [{ type: 'FeeCategory', id: 'LIST' }],
    }),

    getFeeCategoryById: builder.query<ApiResponse<IFeeCategory>, string>({
      query: (id) => ({
        url: `/finance/fee-categories/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'FeeCategory', id }],
    }),

    createFeeCategory: builder.mutation<ApiResponse<IFeeCategory>, Partial<IFeeCategory>>({
      query: (body) => ({
        url: '/finance/fee-categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'FeeCategory', id: 'LIST' }],
    }),

    updateFeeCategory: builder.mutation<
      ApiResponse<IFeeCategory>,
      { id: string; data: Partial<IFeeCategory> }
    >({
      query: ({ id, data }) => ({
        url: `/finance/fee-categories/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'FeeCategory', id },
        { type: 'FeeCategory', id: 'LIST' },
      ],
    }),

    deleteFeeCategory: builder.mutation<ApiResponse<{ message: string }>, string>({
      query: (id) => ({
        url: `/finance/fee-categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'FeeCategory', id: 'LIST' }],
    }),

    // =========================================================================
    // 2. Fee Structures
    // =========================================================================
    getFeeStructures: builder.query<ApiResponse<IFeeStructure[]>, FeeStructureQueryFilters | void>({
      query: (params) => ({
        url: '/finance/fee-structures',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'FeeStructure' as const, id })),
              { type: 'FeeStructure', id: 'LIST' },
            ]
          : [{ type: 'FeeStructure', id: 'LIST' }],
    }),

    getFeeStructureById: builder.query<ApiResponse<IFeeStructure>, string>({
      query: (id) => ({
        url: `/finance/fee-structures/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'FeeStructure', id }],
    }),

    createFeeStructure: builder.mutation<ApiResponse<IFeeStructure>, Partial<IFeeStructure>>({
      query: (body) => ({
        url: '/finance/fee-structures',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'FeeStructure', id: 'LIST' }],
    }),

    updateFeeStructure: builder.mutation<
      ApiResponse<IFeeStructure>,
      { id: string; data: Partial<IFeeStructure> }
    >({
      query: ({ id, data }) => ({
        url: `/finance/fee-structures/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'FeeStructure', id },
        { type: 'FeeStructure', id: 'LIST' },
      ],
    }),

    cloneFeeStructure: builder.mutation<
      ApiResponse<IFeeStructure>,
      { id: string; targetAcademicYearId: string }
    >({
      query: ({ id, targetAcademicYearId }) => ({
        url: `/finance/fee-structures/${id}/clone`,
        method: 'POST',
        body: { targetAcademicYearId },
      }),
      invalidatesTags: [{ type: 'FeeStructure', id: 'LIST' }],
    }),

    // =========================================================================
    // 3. Fee Assignments
    // =========================================================================
    assignFee: builder.mutation<ApiResponse<IStudentFeeAssignment>, any>({
      query: (body) => ({
        url: '/finance/fee-assignments',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'StudentFeeAssignment', id: 'LIST' }],
    }),

    batchAssignFee: builder.mutation<
      ApiResponse<{ assignedCount: number; alreadyAssignedCount: number }>,
      any
    >({
      query: (body) => ({
        url: '/finance/fee-assignments/batch',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'StudentFeeAssignment', id: 'LIST' }],
    }),

    getStudentFeeAssignments: builder.query<
      ApiResponse<IStudentFeeAssignment[]>,
      { studentId: string; academicYearId?: string }
    >({
      query: ({ studentId, academicYearId }) => ({
        url: `/finance/fee-assignments/student/${studentId}`,
        method: 'GET',
        params: academicYearId ? { academicYearId } : undefined,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'StudentFeeAssignment' as const, id })),
              { type: 'StudentFeeAssignment', id: 'LIST' },
            ]
          : [{ type: 'StudentFeeAssignment', id: 'LIST' }],
    }),

    // =========================================================================
    // 4. Invoices
    // =========================================================================
    getInvoices: builder.query<
      ApiResponse<{ invoices: IFeeInvoice[]; total: number; page: number; limit: number }>,
      FeeInvoiceQueryFilters | void
    >({
      query: (params) => ({
        url: '/finance/invoices',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: (result) =>
        result?.data?.invoices
          ? [
              ...result.data.invoices.map(({ id }) => ({ type: 'FeeInvoice' as const, id })),
              { type: 'FeeInvoice', id: 'LIST' },
            ]
          : [{ type: 'FeeInvoice', id: 'LIST' }],
    }),

    getInvoiceById: builder.query<ApiResponse<IFeeInvoice>, string>({
      query: (id) => ({
        url: `/finance/invoices/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'FeeInvoice', id }],
    }),

    generateSingleInvoice: builder.mutation<ApiResponse<IFeeInvoice>, any>({
      query: (body) => ({
        url: '/finance/invoices/single',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'FeeInvoice', id: 'LIST' },
        { type: 'FinanceReport', id: 'ALL' },
      ],
    }),

    generateBulkInvoices: builder.mutation<
      ApiResponse<{ createdCount: number; skippedCount: number; invoices: IFeeInvoice[] }>,
      any
    >({
      query: (body) => ({
        url: '/finance/invoices/bulk',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'FeeInvoice', id: 'LIST' },
        { type: 'FinanceReport', id: 'ALL' },
      ],
    }),

    voidInvoice: builder.mutation<ApiResponse<IFeeInvoice>, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/finance/invoices/${id}/void`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'FeeInvoice', id },
        { type: 'FeeInvoice', id: 'LIST' },
        { type: 'FinanceReport', id: 'ALL' },
      ],
    }),

    recalculateLateFees: builder.mutation<ApiResponse<{ updatedCount: number }>, any>({
      query: (body) => ({
        url: '/finance/invoices/recalculate-late-fees',
        method: 'POST',
        body: body || {},
      }),
      invalidatesTags: [
        { type: 'FeeInvoice', id: 'LIST' },
        { type: 'FinanceReport', id: 'ALL' },
      ],
    }),

    // =========================================================================
    // 5. Payments & Receipts
    // =========================================================================
    collectPayment: builder.mutation<ApiResponse<IPayment>, any>({
      query: (body) => ({
        url: '/finance/payments/collect',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Payment', id: 'LIST' },
        { type: 'FeeInvoice', id: 'LIST' },
        { type: 'FinanceReport', id: 'ALL' },
      ],
    }),

    getPayments: builder.query<
      ApiResponse<{ payments: IPayment[]; total: number; page: number; limit: number }>,
      PaymentQueryFilters | void
    >({
      query: (params) => ({
        url: '/finance/payments',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: (result) =>
        result?.data?.payments
          ? [
              ...result.data.payments.map(({ id }) => ({ type: 'Payment' as const, id })),
              { type: 'Payment', id: 'LIST' },
            ]
          : [{ type: 'Payment', id: 'LIST' }],
    }),

    getPaymentById: builder.query<ApiResponse<IPayment>, string>({
      query: (id) => ({
        url: `/finance/payments/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'Payment', id }],
    }),

    initiateOnlinePayment: builder.mutation<ApiResponse<any>, any>({
      query: (body) => ({
        url: '/finance/payments/online/initiate',
        method: 'POST',
        body,
      }),
    }),

    verifyOnlinePayment: builder.mutation<ApiResponse<IPayment>, any>({
      query: (body) => ({
        url: '/finance/payments/online/verify',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Payment', id: 'LIST' },
        { type: 'FeeInvoice', id: 'LIST' },
        { type: 'FinanceReport', id: 'ALL' },
      ],
    }),

    // =========================================================================
    // 6. Refunds
    // =========================================================================
    requestRefund: builder.mutation<ApiResponse<IRefund>, any>({
      query: (body) => ({
        url: '/finance/refunds/request',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Refund', id: 'LIST' }],
    }),

    reviewRefund: builder.mutation<
      ApiResponse<IRefund>,
      { id: string; status: 'APPROVED' | 'REJECTED'; rejectionReason?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/finance/refunds/${id}/review`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'Refund', id },
        { type: 'Refund', id: 'LIST' },
      ],
    }),

    processRefund: builder.mutation<
      ApiResponse<IRefund>,
      { id: string; gatewayRefundId?: string; remarks?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/finance/refunds/${id}/process`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'Refund', id },
        { type: 'Refund', id: 'LIST' },
        { type: 'Payment', id: 'LIST' },
        { type: 'FeeInvoice', id: 'LIST' },
        { type: 'FinanceReport', id: 'ALL' },
      ],
    }),

    getRefunds: builder.query<
      ApiResponse<{ refunds: IRefund[]; total: number; page: number; limit: number }>,
      RefundQueryFilters | void
    >({
      query: (params) => ({
        url: '/finance/refunds',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: (result) =>
        result?.data?.refunds
          ? [
              ...result.data.refunds.map(({ id }) => ({ type: 'Refund' as const, id })),
              { type: 'Refund', id: 'LIST' },
            ]
          : [{ type: 'Refund', id: 'LIST' }],
    }),

    // =========================================================================
    // 7. Income & Expenses
    // =========================================================================
    createIncome: builder.mutation<ApiResponse<IIncome>, any>({
      query: (body) => ({
        url: '/finance/income',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Income', id: 'LIST' },
        { type: 'FinanceReport', id: 'ALL' },
      ],
    }),

    getIncome: builder.query<
      ApiResponse<{ incomeRecords: IIncome[]; total: number; page: number; limit: number }>,
      IncomeExpenseQueryFilters | void
    >({
      query: (params) => ({
        url: '/finance/income',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: [{ type: 'Income', id: 'LIST' }],
    }),

    createExpense: builder.mutation<ApiResponse<IExpense>, any>({
      query: (body) => ({
        url: '/finance/expenses',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Expense', id: 'LIST' },
        { type: 'FinanceReport', id: 'ALL' },
      ],
    }),

    getExpense: builder.query<
      ApiResponse<{ expenses: IExpense[]; total: number; page: number; limit: number }>,
      IncomeExpenseQueryFilters | void
    >({
      query: (params) => ({
        url: '/finance/expenses',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: [{ type: 'Expense', id: 'LIST' }],
    }),

    // =========================================================================
    // 8. Financial Reports
    // =========================================================================
    getFinanceKPIs: builder.query<
      ApiResponse<IFinanceSummaryKPIs>,
      { academicYearId?: string; campusId?: string; startDate?: string; endDate?: string } | void
    >({
      query: (params) => ({
        url: '/finance/reports/kpis',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: [{ type: 'FinanceReport', id: 'ALL' }],
    }),

    getFeeDefaultersReport: builder.query<
      ApiResponse<IDefaulterRecord[]>,
      { academicClassId?: string; campusId?: string; minDaysOverdue?: number } | void
    >({
      query: (params) => ({
        url: '/finance/reports/defaulters',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: [{ type: 'FinanceReport', id: 'ALL' }],
    }),

    getStudentLedger: builder.query<
      ApiResponse<IStudentLedgerStatement>,
      { studentId: string; academicYearId?: string; startDate?: string; endDate?: string }
    >({
      query: ({ studentId, ...params }) => ({
        url: `/finance/reports/student-ledger/${studentId}`,
        method: 'GET',
        params,
      }),
      providesTags: (_res, _err, { studentId }) => [{ type: 'FinanceReport', id: studentId }],
    }),

    getFeeCollectionReport: builder.query<
      ApiResponse<any>,
      { academicYearId?: string; campusId?: string; startDate?: string; endDate?: string } | void
    >({
      query: (params) => ({
        url: '/finance/reports/collection-summary',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: [{ type: 'FinanceReport', id: 'ALL' }],
    }),

    getIncomeExpenseReport: builder.query<
      ApiResponse<any>,
      { campusId?: string; startDate: string; endDate: string }
    >({
      query: (params) => ({
        url: '/finance/reports/income-vs-expense',
        method: 'GET',
        params,
      }),
      providesTags: [{ type: 'FinanceReport', id: 'ALL' }],
    }),

    // =========================================================================
    // 9. Student & Parent Self-Service
    // =========================================================================
    getMyInvoices: builder.query<ApiResponse<IFeeInvoice[]>, void>({
      query: () => ({
        url: '/finance/my-invoices',
        method: 'GET',
      }),
      providesTags: ['FeeInvoice'],
    }),

    getMyPayments: builder.query<ApiResponse<IPayment[]>, void>({
      query: () => ({
        url: '/finance/my-payments',
        method: 'GET',
      }),
      providesTags: ['Payment'],
    }),

    getMyLedger: builder.query<ApiResponse<IStudentLedgerStatement>, { academicYearId?: string } | void>({
      query: (params) => ({
        url: '/finance/my-ledger',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['FinanceReport'],
    }),

    getChildInvoices: builder.query<ApiResponse<IFeeInvoice[]>, string>({
      query: (studentId) => ({
        url: `/finance/parent/child/${studentId}/invoices`,
        method: 'GET',
      }),
      providesTags: ['FeeInvoice'],
    }),

    getChildPayments: builder.query<ApiResponse<IPayment[]>, string>({
      query: (studentId) => ({
        url: `/finance/parent/child/${studentId}/payments`,
        method: 'GET',
      }),
      providesTags: ['Payment'],
    }),

    getChildLedger: builder.query<
      ApiResponse<IStudentLedgerStatement>,
      { studentId: string; academicYearId?: string }
    >({
      query: ({ studentId, academicYearId }) => ({
        url: `/finance/parent/child/${studentId}/ledger`,
        method: 'GET',
        params: academicYearId ? { academicYearId } : undefined,
      }),
      providesTags: ['FinanceReport'],
    }),
  }),
});

export const {
  useGetFeeCategoriesQuery,
  useGetFeeCategoryByIdQuery,
  useCreateFeeCategoryMutation,
  useUpdateFeeCategoryMutation,
  useDeleteFeeCategoryMutation,
  useGetFeeStructuresQuery,
  useGetFeeStructureByIdQuery,
  useCreateFeeStructureMutation,
  useUpdateFeeStructureMutation,
  useCloneFeeStructureMutation,
  useAssignFeeMutation,
  useBatchAssignFeeMutation,
  useGetStudentFeeAssignmentsQuery,
  useGetInvoicesQuery,
  useGetInvoiceByIdQuery,
  useGenerateSingleInvoiceMutation,
  useGenerateBulkInvoicesMutation,
  useVoidInvoiceMutation,
  useRecalculateLateFeesMutation,
  useCollectPaymentMutation,
  useGetPaymentsQuery,
  useGetPaymentByIdQuery,
  useInitiateOnlinePaymentMutation,
  useVerifyOnlinePaymentMutation,
  useRequestRefundMutation,
  useReviewRefundMutation,
  useProcessRefundMutation,
  useGetRefundsQuery,
  useCreateIncomeMutation,
  useGetIncomeQuery,
  useCreateExpenseMutation,
  useGetExpenseQuery,
  useGetFinanceKPIsQuery,
  useGetFeeDefaultersReportQuery,
  useGetStudentLedgerQuery,
  useGetFeeCollectionReportQuery,
  useGetIncomeExpenseReportQuery,
  useGetMyInvoicesQuery,
  useGetMyPaymentsQuery,
  useGetMyLedgerQuery,
  useGetChildInvoicesQuery,
  useGetChildPaymentsQuery,
  useGetChildLedgerQuery,
} = financeApi;
