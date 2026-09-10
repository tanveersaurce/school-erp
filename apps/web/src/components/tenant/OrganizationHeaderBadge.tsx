import React from 'react';
import {
  useGetSchoolProfileQuery,
  useGetCurrentAcademicYearQuery,
} from '../../features/tenant/tenantApi.js';

export const OrganizationHeaderBadge: React.FC = () => {
  const { data: schoolRes, isLoading: isSchoolLoading } = useGetSchoolProfileQuery();
  const { data: ayRes, isLoading: isAyLoading } = useGetCurrentAcademicYearQuery();

  if (isSchoolLoading || isAyLoading) {
    return (
      <div className="flex items-center space-x-2 text-xs text-slate-400">
        <span className="inline-block w-2 h-2 rounded-full bg-slate-300 animate-pulse" />
        <span>Loading organization...</span>
      </div>
    );
  }

  const school = schoolRes?.data;
  const currentYear = ayRes?.data;

  if (!school) {
    return null;
  }

  return (
    <div
      data-testid="org-header-badge"
      className="hidden md:flex items-center space-x-3 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
    >
      <div className="flex items-center space-x-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="font-semibold text-slate-800">{school.name}</span>
        <span className="text-slate-400 font-mono">({school.code})</span>
      </div>

      {currentYear && (
        <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-200">
          <span className="text-slate-500">Session:</span>
          <span className="font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
            {currentYear.name}
          </span>
        </div>
      )}
    </div>
  );
};
