import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetMyChildrenQuery } from '../../features/student/studentApi.js';
import { StudentStatus } from '@edusphere/common';
import type { StudentDto } from '@edusphere/types';

export const MyChildrenPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: childrenRes, isLoading, error } = useGetMyChildrenQuery();

  const children: StudentDto[] = childrenRes?.data || [];

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center text-gray-500">
        Loading children profiles...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 p-4 text-red-700 border border-red-200">
          Failed to load children profiles. Please make sure your parent account is active.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Parent Portal — My Children
        </h1>
        <p className="text-sm text-gray-500">
          Secure parent perspective: View authorized student profiles, enrollment statuses, and
          school records.
        </p>
      </div>

      {children.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <div className="text-4xl mb-3">👨‍👩‍👧‍👦</div>
          <h3 className="text-base font-semibold text-gray-900">No Children Linked</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            There are currently no active student records linked to your parent portal account.
            Please contact school administration if this is an error.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {children.map((child) => (
            <div
              key={child.id}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4 hover:border-indigo-200 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow">
                    {child.personalDetails.firstName[0]}
                    {child.personalDetails.lastName[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {child.personalDetails.firstName} {child.personalDetails.lastName}
                    </h3>
                    <p className="text-xs font-mono text-gray-500">
                      Adm:{' '}
                      <span className="font-semibold text-indigo-700">{child.admissionNumber}</span>{' '}
                      | ID: {child.studentId}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    child.currentStatus === StudentStatus.ACTIVE
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {child.currentStatus}
                </span>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div>
                  <span className="text-gray-500">Campus:</span>
                  <p className="font-semibold text-gray-900">{child.campusName || 'Main Campus'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Gender & DOB:</span>
                  <p className="font-semibold text-gray-900">
                    {child.personalDetails.gender} •{' '}
                    {new Date(child.personalDetails.dateOfBirth).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Admission Date:</span>
                  <p className="font-semibold text-gray-900">
                    {new Date(child.academicDetails.admissionDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Blood Group:</span>
                  <p className="font-semibold text-gray-900">
                    {child.personalDetails.bloodGroup || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Documents Preview */}
              <div>
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                  Verified Documents ({child.documents?.length || 0})
                </h4>
                {child.documents && child.documents.length > 0 ? (
                  <div className="space-y-1">
                    {child.documents.map((doc: any) => (
                      <div
                        key={doc.id || doc._id}
                        className="flex items-center justify-between text-xs p-2 rounded bg-white border border-gray-100"
                      >
                        <span className="font-medium text-gray-700">{doc.title}</span>
                        <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          {doc.verificationStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No documents on file</p>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => navigate(`/students/${child.id}`)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  View Full Profile →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
