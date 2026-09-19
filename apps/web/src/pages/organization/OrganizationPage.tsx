import React, { useState } from 'react';
import {
  useGetSchoolProfileQuery,
  useUpdateSchoolProfileMutation,
  useGetCampusesQuery,
  useCreateCampusMutation,
  useArchiveCampusMutation,
  useGetAcademicYearsQuery,
  useCreateAcademicYearMutation,
  useActivateAcademicYearMutation,
  useCloseAcademicYearMutation,
  useGetSchoolSettingsQuery,
  useUpdateSchoolSettingsMutation,
  usePreviewNumberingQuery,
  useGetSchoolBrandingQuery,
  useUpdateSchoolBrandingMutation,
  useSetMainCampusMutation,
} from '../../features/tenant/tenantApi.js';
import { Can } from '../../components/auth/Can.js';
import { WeekDay, CampusStatus, AcademicYearStatus } from '@edusphere/common';

type OrgTab = 'profile' | 'campuses' | 'academic-years' | 'settings' | 'branding';

export const OrganizationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<OrgTab>('profile');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Queries
  const {
    data: profileRes,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useGetSchoolProfileQuery();
  const {
    data: campusesRes,
    isLoading: isCampusesLoading,
    refetch: refetchCampuses,
  } = useGetCampusesQuery();
  const { data: ayRes, isLoading: isAyLoading, refetch: refetchAy } = useGetAcademicYearsQuery();
  const {
    data: settingsRes,
    isLoading: isSettingsLoading,
    refetch: refetchSettings,
  } = useGetSchoolSettingsQuery();
  const {
    data: brandingRes,
    isLoading: isBrandingLoading,
    refetch: refetchBranding,
  } = useGetSchoolBrandingQuery();
  const {
    data: previewRes,
    refetch: refetchPreview,
  } = usePreviewNumberingQuery();

  // Mutations
  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateSchoolProfileMutation();
  const [createCampus, { isLoading: isCreatingCampus }] = useCreateCampusMutation();
  const [setMainCampus, { isLoading: isSettingMainCampus }] = useSetMainCampusMutation();
  const [archiveCampus] = useArchiveCampusMutation();
  const [createAcademicYear, { isLoading: isCreatingAy }] = useCreateAcademicYearMutation();
  const [activateAcademicYear] = useActivateAcademicYearMutation();
  const [closeAcademicYear] = useCloseAcademicYearMutation();
  const [updateSettings, { isLoading: isUpdatingSettings }] = useUpdateSchoolSettingsMutation();
  const [updateBranding, { isLoading: isUpdatingBranding }] = useUpdateSchoolBrandingMutation();

  // Local Form States
  const [profileForm, setProfileForm] = useState<any>(null);
  const [newCampusModal, setNewCampusModal] = useState(false);
  const [campusForm, setCampusForm] = useState({
    name: '',
    code: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    email: '',
    phone: '',
  });

  const [newAyModal, setNewAyModal] = useState(false);
  const [ayForm, setAyForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });

  const [settingsForm, setSettingsForm] = useState<any>(null);
  const [brandingForm, setBrandingForm] = useState<any>(null);

  const school = profileRes?.data;
  const campuses = campusesRes?.data || [];
  const academicYears = ayRes?.data || [];
  const settings = settingsRes?.data;
  const branding = brandingRes?.data;
  const numberingPreview = previewRes?.data;

  // Initialize form state once queries load
  React.useEffect(() => {
    if (school && !profileForm) {
      setProfileForm({
        name: school.name || '',
        legalName: school.legalName || '',
        code: school.code || '',
        affiliationBoard: school.affiliationBoard || '',
        registrationNumber: school.registrationNumber || '',
        establishedYear: school.establishedYear || 2000,
        email: school.contact?.email || '',
        phone: school.contact?.phone || '',
        website: school.contact?.website || '',
        street: school.address?.street || '',
        city: school.address?.city || '',
        state: school.address?.state || '',
        postalCode: school.address?.postalCode || '',
        timezone: school.timezone || 'Asia/Kolkata',
        currency: school.currency || 'INR',
      });
    }
  }, [school, profileForm]);

  React.useEffect(() => {
    if (settings && !settingsForm) {
      setSettingsForm({
        dateFormat: settings.general?.dateFormat || 'DD/MM/YYYY',
        timeFormat: settings.general?.timeFormat || '12H',
        weekStartDay: settings.general?.weekStartDay || WeekDay.MONDAY,
        defaultLanguage: settings.general?.defaultLanguage || 'en',
        workingDays: settings.workingDays || [
          WeekDay.MONDAY,
          WeekDay.TUESDAY,
          WeekDay.WEDNESDAY,
          WeekDay.THURSDAY,
          WeekDay.FRIDAY,
          WeekDay.SATURDAY,
        ],
        admissionNumberPrefix: settings.numbering?.admissionNumberPrefix || 'ADM',
        invoicePrefix: settings.numbering?.invoicePrefix || 'INV',
        receiptPrefix: settings.numbering?.receiptPrefix || 'REC',
        employeeIdPrefix: settings.numbering?.employeeIdPrefix || 'EMP',
      });
    }
  }, [settings, settingsForm]);

  React.useEffect(() => {
    if (branding && !brandingForm) {
      setBrandingForm({
        displayName: branding.displayName || '',
        primaryColor: branding.primaryColor || '#4f46e5',
        secondaryColor: branding.secondaryColor || '#06b6d4',
        logoUrl: branding.logoUrl || '',
        faviconUrl: branding.faviconUrl || '',
        reportCardHeader: branding.reportCardHeader || '',
        emailSignature: branding.emailSignature || '',
      });
    }
  }, [branding, brandingForm]);

  // Handlers
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({
        name: profileForm.name,
        legalName: profileForm.legalName,
        code: profileForm.code,
        affiliationBoard: profileForm.affiliationBoard,
        registrationNumber: profileForm.registrationNumber,
        establishedYear: Number(profileForm.establishedYear),
        timezone: profileForm.timezone,
        currency: profileForm.currency,
        contact: {
          email: profileForm.email,
          phone: profileForm.phone,
          website: profileForm.website,
        },
        address: {
          street: profileForm.street,
          city: profileForm.city,
          state: profileForm.state,
          postalCode: profileForm.postalCode,
          country: 'India',
        },
      }).unwrap();
      setNotice({ type: 'success', message: 'School profile updated successfully.' });
      refetchProfile();
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.data?.error?.message || 'Failed to update school profile.',
      });
    }
  };

  const handleCreateCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCampus({
        name: campusForm.name,
        code: campusForm.code,
        address: {
          street: campusForm.street,
          city: campusForm.city,
          state: campusForm.state,
          postalCode: campusForm.postalCode,
          country: campusForm.country,
        },
        contact: {
          email: campusForm.email || undefined,
          phone: campusForm.phone || undefined,
        },
      }).unwrap();
      setNotice({ type: 'success', message: 'Campus site created successfully.' });
      setNewCampusModal(false);
      setCampusForm({
        name: '',
        code: '',
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
        email: '',
        phone: '',
      });
      refetchCampuses();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.data?.error?.message || 'Failed to create campus.' });
    }
  };

  const handleSetMainCampus = async (campusId: string) => {
    try {
      await setMainCampus(campusId).unwrap();
      setNotice({ type: 'success', message: 'Campus designated as main campus successfully.' });
      refetchCampuses();
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.data?.error?.message || 'Failed to set main campus.',
      });
    }
  };

  const handleArchiveCampus = async (campusId: string) => {
    if (!window.confirm('Are you sure you want to archive this campus?')) return;
    try {
      await archiveCampus(campusId).unwrap();
      setNotice({ type: 'success', message: 'Campus archived successfully.' });
      refetchCampuses();
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.data?.error?.message || 'Failed to archive campus.',
      });
    }
  };

  const handleCreateAy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAcademicYear({
        name: ayForm.name,
        startDate: new Date(ayForm.startDate).toISOString(),
        endDate: new Date(ayForm.endDate).toISOString(),
      }).unwrap();
      setNotice({ type: 'success', message: 'Academic calendar year created.' });
      setNewAyModal(false);
      setAyForm({ name: '', startDate: '', endDate: '' });
      refetchAy();
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.data?.error?.message || 'Failed to create academic year.',
      });
    }
  };

  const handleActivateAy = async (ayId: string) => {
    try {
      await activateAcademicYear(ayId).unwrap();
      setNotice({ type: 'success', message: 'Academic year activated as current session.' });
      refetchAy();
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.data?.error?.message || 'Failed to activate academic year.',
      });
    }
  };

  const handleCloseAy = async (ayId: string) => {
    if (
      !window.confirm(
        'Are you sure you want to close this academic year session? Historical records will be preserved.'
      )
    )
      return;
    try {
      await closeAcademicYear(ayId).unwrap();
      setNotice({ type: 'success', message: 'Academic year session closed.' });
      refetchAy();
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.data?.error?.message || 'Failed to close academic year.',
      });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({
        general: {
          dateFormat: settingsForm.dateFormat,
          timeFormat: settingsForm.timeFormat,
          weekStartDay: settingsForm.weekStartDay,
          defaultLanguage: settingsForm.defaultLanguage,
        },
        workingDays: settingsForm.workingDays,
        numbering: {
          admissionNumberPrefix: settingsForm.admissionNumberPrefix,
          admissionNumberDigits: 5,
          invoicePrefix: settingsForm.invoicePrefix,
          receiptPrefix: settingsForm.receiptPrefix,
          employeeIdPrefix: settingsForm.employeeIdPrefix,
        },
      }).unwrap();
      setNotice({ type: 'success', message: 'Operational settings saved.' });
      refetchSettings();
      refetchPreview();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.data?.error?.message || 'Failed to save settings.' });
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateBranding(brandingForm).unwrap();
      setNotice({ type: 'success', message: 'Branding configuration saved.' });
      refetchBranding();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.data?.error?.message || 'Failed to save branding.' });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Organization Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure institutional profile, multi-campus sites, academic calendar, and operational
            branding.
          </p>
        </div>
      </div>

      {/* Alert Notices */}
      {notice && (
        <div
          data-testid="org-alert-notice"
          className={`mb-6 p-4 rounded-lg flex items-center justify-between text-sm ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{notice.message}</span>
          <button
            onClick={() => setNotice(null)}
            className="text-xs font-semibold uppercase hover:underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('profile')}
            data-testid="tab-profile"
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            School Profile
          </button>
          <button
            onClick={() => setActiveTab('campuses')}
            data-testid="tab-campuses"
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'campuses'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Campuses / Branches ({campuses.length})
          </button>
          <button
            onClick={() => setActiveTab('academic-years')}
            data-testid="tab-academic-years"
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'academic-years'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Academic Calendar ({academicYears.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            data-testid="tab-settings"
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'settings'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab('branding')}
            data-testid="tab-branding"
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'branding'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Branding
          </button>
        </nav>
      </div>

      {/* Tab 1: School Profile */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {isProfileLoading || !profileForm ? (
            <p className="text-slate-400 py-8 text-center">Loading institutional profile...</p>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    School Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Legal Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.legalName}
                    onChange={(e) => setProfileForm({ ...profileForm, legalName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    School Code
                  </label>
                  <input
                    type="text"
                    value={profileForm.code}
                    onChange={(e) => setProfileForm({ ...profileForm, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Affiliation Board
                  </label>
                  <input
                    type="text"
                    value={profileForm.affiliationBoard}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, affiliationBoard: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. CBSE / ICSE / IB"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Primary Email
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Primary Phone
                  </label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Timezone
                  </label>
                  <input
                    type="text"
                    value={profileForm.timezone}
                    onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <Can permission="school:update">
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    data-testid="save-profile-btn"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50"
                  >
                    {isUpdatingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </Can>
            </form>
          )}
        </div>
      )}

      {/* Tab 2: Campuses */}
      {activeTab === 'campuses' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Campus Sites & Branches</h2>
            <Can permission="campus:create">
              <button
                onClick={() => setNewCampusModal(true)}
                data-testid="add-campus-btn"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
              >
                + Add Campus Site
              </button>
            </Can>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {isCampusesLoading ? (
              <p className="text-slate-400 py-8 text-center">Loading campus sites...</p>
            ) : campuses.length === 0 ? (
              <p className="text-slate-400 py-8 text-center">No campus sites found.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Campus Name</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {campuses.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-medium text-slate-900 flex items-center gap-2">
                        <span>{c.name}</span>
                        {c.isMain && (
                          <span
                            data-testid={`campus-main-badge-${c.id}`}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200"
                          >
                            MAIN
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{c.code}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {c.address?.city}, {c.address?.state}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            c.status === CampusStatus.ACTIVE
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Can permission="campus:update">
                          {!c.isMain && c.status === CampusStatus.ACTIVE && (
                            <button
                              onClick={() => handleSetMainCampus(c.id)}
                              disabled={isSettingMainCampus}
                              data-testid={`set-main-btn-${c.id}`}
                              className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium px-2 py-1 rounded border border-indigo-200"
                            >
                              Set as Main
                            </button>
                          )}
                        </Can>
                        <Can permission="campus:delete">
                          {c.status === CampusStatus.ACTIVE && (
                            <button
                              onClick={() => handleArchiveCampus(c.id)}
                              className="text-xs text-rose-600 hover:text-rose-800 font-medium ml-2"
                            >
                              Archive
                            </button>
                          )}
                        </Can>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Academic Years */}
      {activeTab === 'academic-years' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Academic Calendar Sessions</h2>
            <Can permission="academic_year:create">
              <button
                onClick={() => setNewAyModal(true)}
                data-testid="add-ay-btn"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
              >
                + New Academic Year
              </button>
            </Can>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {isAyLoading ? (
              <p className="text-slate-400 py-8 text-center">Loading academic calendars...</p>
            ) : academicYears.length === 0 ? (
              <p className="text-slate-400 py-8 text-center">No academic years defined.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Academic Year</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Current Session</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {academicYears.map((ay) => (
                    <tr key={ay.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">{ay.name}</td>
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        {new Date(ay.startDate).toLocaleDateString()} —{' '}
                        {new Date(ay.endDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            ay.status === AcademicYearStatus.ACTIVE
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : ay.status === AcademicYearStatus.DRAFT
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {ay.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {ay.isCurrent ? (
                          <span className="inline-flex items-center text-xs font-bold text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                            ACTIVE CURRENT
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Can permission="academic_year:activate">
                          {!ay.isCurrent && ay.status !== AcademicYearStatus.ARCHIVED && (
                            <button
                              onClick={() => handleActivateAy(ay.id)}
                              className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium px-2 py-1 rounded border border-emerald-200"
                            >
                              Set as Current
                            </button>
                          )}
                        </Can>
                        <Can permission="academic_year:close">
                          {ay.status === AcademicYearStatus.ACTIVE && (
                            <button
                              onClick={() => handleCloseAy(ay.id)}
                              className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium px-2 py-1 rounded border border-slate-200"
                            >
                              Close
                            </button>
                          )}
                        </Can>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Operational Settings */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {isSettingsLoading || !settingsForm ? (
            <p className="text-slate-400 py-8 text-center">Loading settings...</p>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <h3 className="text-sm font-bold uppercase text-slate-700 tracking-wider">
                Localization & Time Formatting
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Date Format
                  </label>
                  <select
                    value={settingsForm.dateFormat}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, dateFormat: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 15/04/2026)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 04/15/2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-04-15)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Time Format
                  </label>
                  <select
                    value={settingsForm.timeFormat}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, timeFormat: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="12H">12 Hours (AM/PM)</option>
                    <option value="24H">24 Hours (Military)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Week Start Day
                  </label>
                  <select
                    value={settingsForm.weekStartDay}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, weekStartDay: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="MONDAY">Monday</option>
                    <option value="SUNDAY">Sunday</option>
                  </select>
                </div>
              </div>

              <h3 className="text-sm font-bold uppercase text-slate-700 tracking-wider pt-4 border-t border-slate-100">
                Weekly Operational Days
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                {[
                  WeekDay.MONDAY,
                  WeekDay.TUESDAY,
                  WeekDay.WEDNESDAY,
                  WeekDay.THURSDAY,
                  WeekDay.FRIDAY,
                  WeekDay.SATURDAY,
                  WeekDay.SUNDAY,
                ].map((day) => {
                  const isChecked = (settingsForm.workingDays || []).includes(day);
                  return (
                    <label
                      key={day}
                      className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer bg-slate-50 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const currentDays = settingsForm.workingDays || [];
                          const updated = e.target.checked
                            ? [...currentDays, day]
                            : currentDays.filter((d: string) => d !== day);
                          setSettingsForm({ ...settingsForm, workingDays: updated });
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        data-testid={`working-day-${day.toLowerCase()}`}
                      />
                      <span className="capitalize">{day.toLowerCase()}</span>
                    </label>
                  );
                })}
              </div>

              <h3 className="text-sm font-bold uppercase text-slate-700 tracking-wider pt-4 border-t border-slate-100">
                Automated Document Numbering Prefixes
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Admission Number Prefix
                  </label>
                  <input
                    type="text"
                    value={settingsForm.admissionNumberPrefix}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, admissionNumberPrefix: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Fee Invoice Prefix
                  </label>
                  <input
                    type="text"
                    value={settingsForm.invoicePrefix}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, invoicePrefix: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Payment Receipt Prefix
                  </label>
                  <input
                    type="text"
                    value={settingsForm.receiptPrefix}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, receiptPrefix: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Employee ID Prefix
                  </label>
                  <input
                    type="text"
                    value={settingsForm.employeeIdPrefix}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, employeeIdPrefix: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono uppercase"
                    data-testid="employee-id-prefix-input"
                  />
                </div>
              </div>

              <h3 className="text-sm font-bold uppercase text-slate-700 tracking-wider pt-4 border-t border-slate-100">
                Live Document Sequence Preview
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <span className="block text-xs text-slate-500 font-medium">Sample Admission No.</span>
                  <span className="font-mono text-sm font-bold text-slate-800" data-testid="preview-admission-number">
                    {numberingPreview?.admissionNumber || `${settingsForm.admissionNumberPrefix || 'ADM'}-${new Date().getFullYear()}-00001`}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500 font-medium">Sample Invoice No.</span>
                  <span className="font-mono text-sm font-bold text-slate-800" data-testid="preview-invoice-number">
                    {numberingPreview?.invoiceNumber || `${settingsForm.invoicePrefix || 'INV'}-${new Date().getFullYear()}-00001`}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500 font-medium">Sample Receipt No.</span>
                  <span className="font-mono text-sm font-bold text-slate-800" data-testid="preview-receipt-number">
                    {numberingPreview?.receiptNumber || `${settingsForm.receiptPrefix || 'REC'}-${new Date().getFullYear()}-00001`}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500 font-medium">Sample Employee ID</span>
                  <span className="font-mono text-sm font-bold text-slate-800" data-testid="preview-employee-id">
                    {numberingPreview?.employeeId || `${settingsForm.employeeIdPrefix || 'EMP'}-0001`}
                  </span>
                </div>
              </div>

              <Can permission="settings:update">
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={isUpdatingSettings}
                    data-testid="save-settings-btn"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    {isUpdatingSettings ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </Can>
            </form>
          )}
        </div>
      )}

      {/* Tab 5: Branding */}
      {activeTab === 'branding' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {isBrandingLoading || !brandingForm ? (
            <p className="text-slate-400 py-8 text-center">Loading branding configuration...</p>
          ) : (
            <form onSubmit={handleSaveBranding} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={brandingForm.displayName}
                    onChange={(e) =>
                      setBrandingForm({ ...brandingForm, displayName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={brandingForm.primaryColor}
                      onChange={(e) =>
                        setBrandingForm({ ...brandingForm, primaryColor: e.target.value })
                      }
                      className="w-10 h-10 rounded border border-slate-300 p-1 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={brandingForm.primaryColor}
                      onChange={(e) =>
                        setBrandingForm({ ...brandingForm, primaryColor: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Secondary Brand Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={brandingForm.secondaryColor || '#06b6d4'}
                      onChange={(e) =>
                        setBrandingForm({ ...brandingForm, secondaryColor: e.target.value })
                      }
                      className="w-10 h-10 rounded border border-slate-300 p-1 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={brandingForm.secondaryColor || '#06b6d4'}
                      onChange={(e) =>
                        setBrandingForm({ ...brandingForm, secondaryColor: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                      data-testid="secondary-color-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Report Card Header Text
                  </label>
                  <input
                    type="text"
                    value={brandingForm.reportCardHeader}
                    onChange={(e) =>
                      setBrandingForm({ ...brandingForm, reportCardHeader: e.target.value })
                    }
                    placeholder="e.g. Official Grade Sheet & Evaluation Report"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={brandingForm.logoUrl || ''}
                    onChange={(e) =>
                      setBrandingForm({ ...brandingForm, logoUrl: e.target.value })
                    }
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    data-testid="logo-url-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Favicon URL
                  </label>
                  <input
                    type="url"
                    value={brandingForm.faviconUrl || ''}
                    onChange={(e) =>
                      setBrandingForm({ ...brandingForm, faviconUrl: e.target.value })
                    }
                    placeholder="https://example.com/favicon.ico"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    data-testid="favicon-url-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Default Email Signature
                </label>
                <textarea
                  rows={3}
                  value={brandingForm.emailSignature || ''}
                  onChange={(e) =>
                    setBrandingForm({ ...brandingForm, emailSignature: e.target.value })
                  }
                  placeholder="e.g. Regards, School Administration"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  data-testid="email-signature-input"
                />
              </div>

              <Can permission="branding:update">
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={isUpdatingBranding}
                    data-testid="save-branding-btn"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    {isUpdatingBranding ? 'Saving...' : 'Save Branding'}
                  </button>
                </div>
              </Can>
            </form>
          )}
        </div>
      )}

      {/* Modal: Add Campus */}
      {newCampusModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Campus / Branch Site</h3>
            <form onSubmit={handleCreateCampus} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={campusForm.name}
                    onChange={(e) => setCampusForm({ ...campusForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="e.g. City Campus"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Code</label>
                  <input
                    type="text"
                    required
                    value={campusForm.code}
                    onChange={(e) => setCampusForm({ ...campusForm, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono uppercase"
                    placeholder="e.g. CC-01"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  required
                  value={campusForm.street}
                  onChange={(e) => setCampusForm({ ...campusForm, street: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={campusForm.city}
                    onChange={(e) => setCampusForm({ ...campusForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={campusForm.state}
                    onChange={(e) => setCampusForm({ ...campusForm, state: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewCampusModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCampus}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isCreatingCampus ? 'Creating...' : 'Create Campus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Academic Year */}
      {newAyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">New Academic Calendar Session</h3>
            <form onSubmit={handleCreateAy} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Session Name
                </label>
                <input
                  type="text"
                  required
                  value={ayForm.name}
                  onChange={(e) => setAyForm({ ...ayForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                  placeholder="e.g. 2026-2027"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={ayForm.startDate}
                  onChange={(e) => setAyForm({ ...ayForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">End Date</label>
                <input
                  type="date"
                  required
                  value={ayForm.endDate}
                  onChange={(e) => setAyForm({ ...ayForm, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewAyModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAy}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isCreatingAy ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
