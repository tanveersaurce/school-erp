import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText,
  Printer,
  ArrowLeft,
} from 'lucide-react';
import { Money } from '@edusphere/common';
import { useGetPayslipByIdQuery, useGetMyPayslipsQuery } from '../../features/hr/hrApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const PayslipsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // If id is provided, fetch that specific payslip; otherwise fetch my payslips
  const { data: singleRes, isLoading: loadingSingle } = useGetPayslipByIdQuery(id || '', {
    skip: !id,
  });
  const { data: myRes, isLoading: loadingMy } = useGetMyPayslipsQuery(undefined, {
    skip: Boolean(id),
  });

  const payslip = singleRes?.data;
  const myPayslips = myRes?.data || [];

  const handlePrint = () => {
    window.print();
  };

  // If viewing a specific payslip
  if (id) {
    if (loadingSingle) {
      return (
        <div className="py-24 flex justify-center">
          <Spinner size="lg" />
        </div>
      );
    }

    if (!payslip || typeof payslip !== 'object' || !Array.isArray(payslip.earnings)) {
      return (
        <div className="py-12 text-center text-slate-400">
          <p>Payslip not found or access restricted.</p>
          <Link to="/hr/payslips" className="text-indigo-400 text-sm mt-2 inline-block">
            &larr; View My Payslips
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-6 pb-12 max-w-4xl mx-auto">
        <div className="flex items-center justify-between print:hidden">
          <Link
            to="/hr/payroll"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Printer className="w-4 h-4" />}
            onClick={handlePrint}
          >
            Print Payslip
          </Button>
        </div>

        {/* Payslip Document Container */}
        <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-2xl border border-slate-200 print:shadow-none print:p-0 print:border-none">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-900 pb-6 mb-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                {(payslip as any).schoolName || 'EduSphere Academy'}
              </h1>
              <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">
                Official Monthly Salary Statement
              </p>
            </div>
            <div className="mt-3 sm:mt-0 text-left sm:text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 inline-block mb-1">
                {payslip.periodName}
              </span>
              <p className="text-xs text-slate-500">
                Generated {new Date(payslip.generatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Employee & Pay Period Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-8">
            <div>
              <span className="text-slate-400 block uppercase tracking-wider text-[10px]">
                Employee Name
              </span>
              <span className="font-bold text-slate-900 text-sm">{payslip.employeeName}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase tracking-wider text-[10px]">
                Employee Code
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {payslip.employeeCode}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase tracking-wider text-[10px]">
                Department
              </span>
              <span className="font-semibold text-slate-800">
                {payslip.department || (payslip as any).departmentName || 'General'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase tracking-wider text-[10px]">
                Designation
              </span>
              <span className="font-semibold text-slate-800">
                {payslip.designation || (payslip as any).designationName || 'Faculty'}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <span className="text-slate-400 block uppercase tracking-wider text-[10px]">
                Working Days
              </span>
              <span className="font-bold text-slate-900">{payslip.workingDays}</span>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <span className="text-slate-400 block uppercase tracking-wider text-[10px]">
                Paid Days
              </span>
              <span className="font-bold text-emerald-700">{payslip.paidDays}</span>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <span className="text-slate-400 block uppercase tracking-wider text-[10px]">
                Unpaid / LWP Days
              </span>
              <span className="font-bold text-rose-700">{payslip.unpaidDays}</span>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <span className="text-slate-400 block uppercase tracking-wider text-[10px]">
                Currency
              </span>
              <span className="font-bold text-slate-900">{payslip.currency}</span>
            </div>
          </div>

          {/* 2-Column Earnings & Deductions Tables */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
            {/* Earnings */}
            <div>
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-2 mb-3">
                Earnings
              </h3>
              <table className="w-full text-xs">
                <tbody>
                  {payslip.earnings.map((e, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-2 text-slate-700">{e.name}</td>
                      <td className="py-2 text-right font-mono font-medium text-slate-900">
                        {Money.format(e.amount, payslip.currency)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-900 font-bold">
                    <td className="py-2.5 text-slate-900">Total Gross Earnings</td>
                    <td className="py-2.5 text-right font-mono text-emerald-700">
                      {Money.format(payslip.grossEarnings ?? (payslip as any).grossPay ?? 0, payslip.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deductions */}
            <div>
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-2 mb-3">
                Deductions
              </h3>
              <table className="w-full text-xs">
                <tbody>
                  {payslip.deductions.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-2 text-slate-400 italic">
                        No deductions applied
                      </td>
                    </tr>
                  ) : (
                    payslip.deductions.map((d, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-2 text-slate-700">{d.name}</td>
                        <td className="py-2 text-right font-mono font-medium text-rose-700">
                          {Money.format(d.amount, payslip.currency)}
                        </td>
                      </tr>
                    ))
                  )}
                  <tr className="border-t-2 border-slate-900 font-bold">
                    <td className="py-2.5 text-slate-900">Total Deductions</td>
                    <td className="py-2.5 text-right font-mono text-rose-700">
                      {Money.format(payslip.totalDeductions, payslip.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Net Pay Banner */}
          <div className="p-6 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Net Disbursed Amount
              </span>
              <p className="text-xs text-slate-400 mt-0.5">Payment Method: Bank Transfer</p>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight font-mono">
                {Money.format(payslip.netPay, payslip.currency)}
              </span>
            </div>
          </div>

          <div className="mt-12 text-center border-t border-slate-200 pt-6 text-[10px] text-slate-400">
            <p>This is a system-generated electronic payslip and does not require a physical signature.</p>
            <p className="mt-0.5">EduSphere HR & Payroll Engine &bull; Zero-Float Integer Accounting Verified</p>
          </div>
        </div>
      </div>
    );
  }

  // If viewing "My Payslips" list
  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <FileText className="w-7 h-7 text-indigo-400" />
          My Digital Payslips
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Access and download your itemized monthly payroll statements
        </p>
      </div>

      <Card className="p-6 bg-slate-800 border-slate-700">
        {loadingMy ? (
          <div className="py-16 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : myPayslips.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p>No payslips found for your account.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myPayslips.map((ps) => (
              <div
                key={ps.payrollItemId}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-between hover:border-slate-600 transition"
              >
                <div>
                  <h3 className="font-bold text-white text-base">{ps.periodName}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Gross: {Money.format(ps.grossEarnings ?? (ps as any).grossPay ?? 0, ps.currency)} &bull; Deductions:{' '}
                    {Money.format(ps.totalDeductions, ps.currency)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    {Money.format(ps.netPay, ps.currency)}
                  </span>
                  <Link to={`/hr/payslips/${ps.payrollItemId}`}>
                    <Button size="sm" variant="outline" leftIcon={<FileText className="w-3.5 h-3.5" />}>
                      View Payslip
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
