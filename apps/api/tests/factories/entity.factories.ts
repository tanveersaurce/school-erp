import { Types } from 'mongoose';
import {
  Tenant,
  School,
  Campus,
  AcademicYear,
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  Session,
  Employee,
  TeacherProfile,
  Student,
  Guardian,
  StudentParentRelation,
  StudentEnrollment,
  AcademicClass,
  Class as LegacyClass,
  Section,
  Subject,
  ClassSubject,
  TeacherSubjectAssignment,
  Period,
  Classroom,
  Timetable,
  TimetableEntry,
  StudentAttendance,
  Holiday,
  AttendanceCorrection,
  Assignment,
  AssignmentSubmission,
  Exam,
  ExamSchedule,
  ExamMark,
  Result,
  GradingScheme,
  FeeCategory,
  FeeStructure,
  StudentFeeAssignment,
  FeeInvoice,
  Payment,
  Refund,
  LeaveType,
  LeavePolicy,
  LeaveApplication,
  SalaryComponent,
  SalaryStructure,
  Payslip,
  Book,
  BookCopy,
  LibraryLocation,
  LibraryMember,
  Circulation,
  Vehicle,
  VehicleType,
  TransportRoute,
  TransportStop,
  StudentTransportAllocation,
  Hostel,
  HostelBuilding,
  HostelFloor,
  HostelRoom,
  HostelBed,
  HostelStudentAllocation,
  InventoryStore,
  InventoryLocation,
  InventoryItem,
  InventoryCategory,
  InventoryUnit,
  InventoryStockLedger,
  InventoryAsset,
  Notification,
  Announcement,
  CommunicationJob,
  AuditLog,
} from '@edusphere/database';
import {
  TenantPlan,
  TenantBillingStatus,
  TenantStatus,
  CampusStatus,
  AcademicYearStatus,
  UserType,
  UserStatus,
  StudentStatus,
  Gender,
  TimetableStatus,
  AttendanceStatus,
  AssignmentType,
  AssignmentStatus,
  SubmissionType,
  SubmissionStatus,
  ExamStatus,
  FeeCategoryType,
  FeeFrequency,
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod,
  BookCopyStatus,
  MemberStatus,
  CirculationStatus,
  HostelType,
  BedStatus,
  AssetStatus,
  NotificationChannel,
  NotificationPriority,
  AuditAction,
  AuditActorType,
} from '@edusphere/common';

let seq = 1000;
const nextSeq = () => ++seq;

// ============================================================================
// 1. Organization & Multi-Tenancy Factories
// ============================================================================
export async function createTenant(overrides: Record<string, any> = {}) {
  const n = nextSeq();
  return Tenant.create({
    _id: new Types.ObjectId(),
    name: `Test Tenant ${n}`,
    slug: `tenant-${n}`,
    plan: TenantPlan.ENTERPRISE,
    billingStatus: TenantBillingStatus.ACTIVE,
    status: TenantStatus.ACTIVE,
    features: { maxStudents: 2000, modulesEnabled: ['ALL'], customBranding: true },
    ...overrides,
  });
}

export async function createSchool(tenantId: Types.ObjectId, overrides: Record<string, any> = {}) {
  const n = nextSeq();
  return School.create({
    _id: new Types.ObjectId(),
    tenantId,
    name: `Test School ${n}`,
    code: `SCH-${n}`,
    affiliationBoard: 'CBSE',
    contact: { email: `school${n}@test.edu`, phone: '9876543210' },
    address: { street: '123 Education Lane', city: 'Metropolis', state: 'State', postalCode: '12345', country: 'Country' },
    timezone: 'UTC',
    currency: 'USD',
    ...overrides,
  });
}

export async function createCampus(tenantId: Types.ObjectId, schoolId: Types.ObjectId, overrides: Record<string, any> = {}) {
  const n = nextSeq();
  return Campus.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    name: `Campus ${n}`,
    code: `CMP-${n}`,
    address: { street: 'Campus Blvd', city: 'Metropolis', state: 'State', postalCode: '12345', country: 'Country' },
    status: CampusStatus.ACTIVE,
    isMain: overrides.isMain ?? overrides.isMainCampus ?? false,
    ...overrides,
  });
}

export async function createAcademicYear(
  tenantId: Types.ObjectId,
  schoolId: Types.ObjectId,
  campusId: Types.ObjectId,
  overrides: Record<string, any> = {}
) {
  const n = nextSeq();
  const year = 2026 + (n % 10);
  return AcademicYear.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    campusId,
    name: `Academic Year ${year}-${year + 1} (${n})`,
    code: `AY-${year}-${n}`,
    startDate: new Date(`${year}-06-01`),
    endDate: new Date(`${year + 1}-05-31`),
    status: AcademicYearStatus.ACTIVE,
    isCurrent: false,
    ...overrides,
  });
}

// ============================================================================
// 2. Identity, RBAC & Session Factories
// ============================================================================
export async function createUser(tenantId: Types.ObjectId, overrides: Record<string, any> = {}) {
  const n = nextSeq();
  return User.create({
    _id: new Types.ObjectId(),
    tenantId,
    email: `user${n}@test.edu`,
    passwordHash: '$2a$12$e8wR80B7jX9Fm.fR0x8f7O86D491.5K8i3M6n/l0N9wZ3hC3E4R7u',
    userType: UserType.STAFF,
    status: UserStatus.ACTIVE,
    isSuperAdmin: false,
    ...overrides,
  });
}

export async function createRole(tenantId: Types.ObjectId, overrides: Record<string, any> = {}) {
  const n = nextSeq();
  return Role.create({
    _id: new Types.ObjectId(),
    tenantId,
    name: `ROLE_${n}`,
    code: `ROLE_${n}`,
    description: `Test Role ${n}`,
    userType: UserType.STAFF,
    isSystem: false,
    ...overrides,
  });
}

export async function createPermission(overrides: Record<string, any> = {}) {
  const n = nextSeq();
  return Permission.create({
    _id: new Types.ObjectId(),
    action: `action_${n}`,
    subject: `subject_${n}`,
    permissionString: `subject_${n}:action_${n}`,
    description: `Permission ${n}`,
    module: 'SYSTEM',
    ...overrides,
  });
}

export async function createUserRoleMapping(tenantId: Types.ObjectId, userId: Types.ObjectId, roleId: Types.ObjectId, overrides: Record<string, any> = {}) {
  return UserRole.create({
    _id: new Types.ObjectId(),
    tenantId,
    userId,
    roleId,
    ...overrides,
  });
}

// ============================================================================
// 3. Employee & Teacher Profile Factories
// ============================================================================
export async function createEmployee(tenantId: Types.ObjectId, schoolId: Types.ObjectId, userId: Types.ObjectId, overrides: Record<string, any> = {}) {
  const n = nextSeq();
  const firstName = overrides.firstName || `First${n}`;
  const lastName = overrides.lastName || `Last${n}`;
  return Employee.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    userId,
    employeeId: `EMP-${2026}-${String(n).padStart(4, '0')}`,
    firstName,
    lastName,
    displayName: overrides.displayName || `${firstName} ${lastName}`,
    email: `employee${n}@test.edu`,
    phone: `987000${String(n).padStart(4, '0')}`,
    gender: Gender.FEMALE,
    dateOfBirth: new Date('1990-01-01'),
    joiningDate: new Date('2024-01-01'),
    departmentId: new Types.ObjectId(),
    designationId: new Types.ObjectId(),
    employmentType: 'FULL_TIME',
    employmentStatus: 'ACTIVE',
    ...overrides,
  });
}

export async function createTeacherProfile(tenantId: Types.ObjectId, employeeId: Types.ObjectId, overrides: Record<string, any> = {}) {
  const n = nextSeq();
  return TeacherProfile.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId: overrides.schoolId || new Types.ObjectId(),
    employeeId,
    teacherCode: `TCH-${n}`,
    specialization: 'Mathematics',
    maxWeeklyPeriods: 30,
    ...overrides,
  });
}

// ============================================================================
// 4. Student, Guardian & Enrollment Factories
// ============================================================================
export async function createStudent(tenantId: Types.ObjectId, schoolId: Types.ObjectId, overrides: Record<string, any> = {}) {
  const n = nextSeq();
  const personal = overrides.personalDetails || {};
  const contact = overrides.contactDetails || {};
  return Student.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    admissionNumber: `ADM-${2026}-${String(n).padStart(5, '0')}`,
    studentId: `STU-${2026}-${String(n).padStart(4, '0')}`,
    personalDetails: {
      firstName: overrides.firstName || `StudentFirst${n}`,
      lastName: overrides.lastName || `StudentLast${n}`,
      dateOfBirth: new Date('2010-05-15'),
      gender: Gender.MALE,
      nationality: 'Indian',
      ...personal,
    },
    contactDetails: {
      currentAddress: { street: '456 Student Rd', city: 'Metropolis', state: 'State', postalCode: '12345', country: 'Country' },
      ...contact,
    },
    currentStatus: StudentStatus.ACTIVE,
    ...overrides,
  });
}

export async function createGuardian(tenantId: Types.ObjectId, overrides: Record<string, any> = {}) {
  const n = nextSeq();
  const personal = overrides.personalDetails || {};
  const contact = overrides.contactDetails || {};
  return Guardian.create({
    _id: new Types.ObjectId(),
    tenantId,
    guardianId: `GRD-${2026}-${String(n).padStart(4, '0')}`,
    personalDetails: {
      firstName: `ParentFirst${n}`,
      lastName: `ParentLast${n}`,
      ...personal,
    },
    contactDetails: {
      email: `parent${n}@test.edu`,
      phone: `987111${String(n).padStart(4, '0')}`,
      address: { street: '456 Student Rd', city: 'Metropolis', state: 'State', postalCode: '12345', country: 'Country' },
      ...contact,
    },
    ...overrides,
  });
}

export async function createStudentParentRelation(
  tenantId: Types.ObjectId,
  studentId: Types.ObjectId,
  guardianId: Types.ObjectId,
  overrides: Record<string, any> = {}
) {
  return StudentParentRelation.create({
    _id: new Types.ObjectId(),
    tenantId,
    studentId,
    parentId: guardianId,
    relationshipType: 'FATHER',
    isPrimaryContact: true,
    isEmergencyContact: true,
    ...overrides,
  });
}

export async function createStudentEnrollment(
  tenantId: Types.ObjectId,
  schoolId: Types.ObjectId,
  studentId: Types.ObjectId,
  academicYearId: Types.ObjectId,
  academicClassId: Types.ObjectId,
  overrides: Record<string, any> = {}
) {
  const n = nextSeq();
  return StudentEnrollment.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    studentId,
    academicYearId,
    academicClassId,
    rollNumber: (n % 50) + 1,
    enrollmentDate: new Date('2026-06-01'),
    status: 'ACTIVE',
    ...overrides,
  });
}

// ============================================================================
// 5. Academic Curriculum & Structure Factories
// ============================================================================
export async function createAcademicClass(
  tenantId: Types.ObjectId,
  schoolId: Types.ObjectId,
  campusId: Types.ObjectId,
  academicYearId: Types.ObjectId,
  overrides: Record<string, any> = {}
) {
  const n = nextSeq();
  return AcademicClass.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    campusId,
    academicYearId,
    classId: overrides.classId || new Types.ObjectId(),
    sectionId: overrides.sectionId || new Types.ObjectId(),
    name: `Grade ${n % 12 + 1} - Section ${String.fromCharCode(65 + (n % 4))}`,
    code: `CLS-${n}`,
    capacity: 40,
    enrolledCount: 0,
    status: 'ACTIVE',
    ...overrides,
  });
}

export async function createSubject(tenantId: Types.ObjectId, schoolId: Types.ObjectId, overrides: Record<string, any> = {}) {
  const n = nextSeq();
  return Subject.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    name: `Subject ${n}`,
    code: `SUB-${n}`,
    type: 'CORE',
    isElective: false,
    ...overrides,
  });
}

export async function createClassSubject(
  tenantId: Types.ObjectId,
  academicClassId: Types.ObjectId,
  subjectId: Types.ObjectId,
  overrides: Record<string, any> = {}
) {
  return ClassSubject.create({
    _id: new Types.ObjectId(),
    tenantId,
    academicClassId,
    subjectId,
    weeklyPeriods: 5,
    ...overrides,
  });
}

// ============================================================================
// 6. Timetable & Classroom Factories
// ============================================================================
export async function createClassroom(
  tenantId: Types.ObjectId,
  schoolId: Types.ObjectId,
  campusId: Types.ObjectId,
  overrides: Record<string, any> = {}
) {
  const n = nextSeq();
  return Classroom.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    campusId,
    name: `Room ${n}`,
    code: `RM-${n}`,
    capacity: 40,
    type: 'LECTURE_HALL',
    status: 'ACTIVE',
    ...overrides,
  });
}

export async function createPeriod(
  tenantId: Types.ObjectId,
  schoolId: Types.ObjectId,
  campusId: Types.ObjectId,
  overrides: Record<string, any> = {}
) {
  const n = nextSeq();
  return Period.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    campusId,
    periodNumber: (n % 8) + 1,
    name: `Period ${(n % 8) + 1}`,
    startTime: '09:00',
    endTime: '09:45',
    type: 'TEACHING',
    ...overrides,
  });
}

export async function createTimetable(
  tenantId: Types.ObjectId,
  schoolId: Types.ObjectId,
  academicYearId: Types.ObjectId,
  academicClassId: Types.ObjectId,
  overrides: Record<string, any> = {}
) {
  const n = nextSeq();
  return Timetable.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    academicYearId,
    academicClassId,
    name: `Timetable ${n}`,
    status: TimetableStatus.PUBLISHED,
    version: 1,
    ...overrides,
  });
}

// ============================================================================
// 7. Attendance Factories
// ============================================================================
export async function createStudentAttendance(
  tenantId: Types.ObjectId,
  schoolId: Types.ObjectId,
  academicClassId: Types.ObjectId,
  studentId: Types.ObjectId,
  academicYearId: Types.ObjectId,
  overrides: Record<string, any> = {}
) {
  return StudentAttendance.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    academicClassId,
    classId: overrides.classId || academicClassId,
    sectionId: overrides.sectionId || new Types.ObjectId(),
    studentId,
    academicYearId,
    date: overrides.date || new Date('2026-09-01'),
    attendanceMode: overrides.attendanceMode || 'DAILY',
    takenBy: overrides.takenBy || new Types.ObjectId(),
    status: overrides.status || 'SUBMITTED',
    records: overrides.records || [
      {
        studentId,
        status: AttendanceStatus.PRESENT,
      },
    ],
    ...overrides,
  });
}

// ============================================================================
// 8. Homework & Assignment Factories
// ============================================================================
export async function createAssignment(
  tenantId: Types.ObjectId,
  schoolId: Types.ObjectId,
  academicClassId: Types.ObjectId,
  subjectId: Types.ObjectId,
  teacherId: Types.ObjectId,
  overrides: Record<string, any> = {}
) {
  const n = nextSeq();
  const due = overrides.dueDate || new Date(Date.now() + 86400000 * 7);
  return Assignment.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    campusId: overrides.campusId || new Types.ObjectId(),
    academicYearId: overrides.academicYearId || new Types.ObjectId(),
    academicClassId,
    subjectId,
    teacherId,
    title: overrides.title || `Assignment ${n}`,
    description: overrides.description || `Instructions for assignment ${n}`,
    assignmentType: overrides.assignmentType || overrides.type || 'HOMEWORK',
    assignedDate: overrides.assignedDate || new Date(),
    dueDate: due,
    dueTime: overrides.dueTime || '23:59',
    dueAt: overrides.dueAt || due,
    maxScore: overrides.maxScore || 100,
    status: overrides.status || AssignmentStatus.PUBLISHED,
    submissionType: overrides.submissionType || 'BOTH',
    targetType: overrides.targetType || 'ALL',
    createdBy: overrides.createdBy || teacherId,
    ...overrides,
  });
}

export async function createAssignmentSubmission(
  tenantId: Types.ObjectId,
  assignmentId: Types.ObjectId,
  studentId: Types.ObjectId,
  overrides: Record<string, any> = {}
) {
  return AssignmentSubmission.create({
    _id: new Types.ObjectId(),
    tenantId,
    assignmentId,
    studentId,
    status: SubmissionStatus.SUBMITTED,
    submittedAt: new Date(),
    textContent: 'Completed assignment submission answer.',
    attachments: [],
    attemptNumber: 1,
    ...overrides,
  });
}

// ============================================================================
// 9. Examination & Marks Factories
// ============================================================================
export async function createExam(
  tenantId: Types.ObjectId,
  schoolId: Types.ObjectId,
  academicYearId: Types.ObjectId,
  overrides: Record<string, any> = {}
) {
  const n = nextSeq();
  return Exam.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    academicYearId,
    name: `Term Examination ${n}`,
    code: `EXAM-${n}`,
    term: 'TERM_1',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-15'),
    status: ExamStatus.SCHEDULED,
    ...overrides,
  });
}

export async function createExamSchedule(
  tenantId: Types.ObjectId,
  examId: Types.ObjectId,
  academicClassId: Types.ObjectId,
  subjectId: Types.ObjectId,
  overrides: Record<string, any> = {}
) {
  return ExamSchedule.create({
    _id: new Types.ObjectId(),
    tenantId,
    examId,
    academicClassId,
    subjectId,
    examDate: overrides.examDate ?? overrides.date ?? new Date('2026-10-05'),
    startTime: '09:00',
    endTime: '12:00',
    maxMarks: 100,
    passMarks: overrides.passMarks ?? overrides.passingMarks ?? 40,
    ...overrides,
  });
}

export async function createExamMark(
  tenantId: Types.ObjectId,
  examScheduleId: Types.ObjectId,
  studentId: Types.ObjectId,
  overrides: Record<string, any> = {}
) {
  return ExamMark.create({
    _id: new Types.ObjectId(),
    tenantId,
    examScheduleId,
    studentId,
    marksObtained: 85,
    isAbsent: false,
    isLocked: false,
    ...overrides,
  });
}

// ============================================================================
// 10. Fees & Finance Factories
// ============================================================================
export async function createFeeCategory(tenantId: Types.ObjectId, schoolId: Types.ObjectId, overrides: Record<string, any> = {}) {
  const n = nextSeq();
  return FeeCategory.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    name: `Tuition Fee ${n}`,
    code: `TUI-${n}`,
    type: FeeCategoryType.TUITION,
    ...overrides,
  });
}

export async function createFeeStructure(
  tenantId: Types.ObjectId,
  schoolId: Types.ObjectId,
  academicYearId: Types.ObjectId,
  feeCategoryId: Types.ObjectId,
  overrides: Record<string, any> = {}
) {
  const n = nextSeq();
  const amt = overrides.totalAmount ?? overrides.amount ?? 150000;
  return FeeStructure.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    academicYearId,
    feeCategoryId,
    classId: overrides.classId || new Types.ObjectId(),
    name: overrides.name || overrides.title || `Grade 10 Fee Structure ${n}`,
    title: overrides.title || overrides.name || `Grade 10 Fee Structure ${n}`,
    amount: amt,
    totalAmount: amt,
    frequency: FeeFrequency.ANNUAL,
    dueDate: new Date('2026-08-31'),
    ...overrides,
  });
}

export async function createFeeInvoice(
  tenantId: Types.ObjectId,
  schoolId: Types.ObjectId,
  studentId: Types.ObjectId,
  academicYearId: Types.ObjectId,
  overrides: Record<string, any> = {}
) {
  const n = nextSeq();
  const amt = overrides.totalAmount ?? overrides.amount ?? 150000;
  const paid = overrides.paidAmount ?? 0;
  const bal = overrides.balanceAmount ?? (amt - paid);
  return FeeInvoice.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    studentId,
    academicYearId,
    classId: overrides.classId || new Types.ObjectId(),
    invoiceNumber: `INV-${2026}-${String(n).padStart(5, '0')}`,
    subTotal: overrides.subTotal ?? amt,
    totalAmount: amt,
    paidAmount: paid,
    balanceAmount: bal,
    totalDiscount: overrides.discountAmount ?? overrides.totalDiscount ?? 0,
    lateFeeAmount: overrides.fineAmount ?? overrides.lateFeeAmount ?? 0,
    status: overrides.status ?? InvoiceStatus.ISSUED,
    issueDate: overrides.issueDate ?? new Date(),
    dueDate: overrides.dueDate ?? new Date(Date.now() + 86400000 * 30),
    lineItems: overrides.lineItems ?? [
      { description: 'Tuition Fee', amount: amt, netAmount: amt },
    ],
    ...overrides,
  });
}

export async function createPayment(
  tenantId: Types.ObjectId,
  schoolId: Types.ObjectId,
  invoiceId: Types.ObjectId,
  studentId: Types.ObjectId,
  overrides: Record<string, any> = {}
) {
  const n = nextSeq();
  return Payment.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    invoiceId,
    studentId,
    receiptNumber: `REC-${2026}-${String(n).padStart(5, '0')}`,
    amount: 150000,
    paymentMethod: overrides.paymentMethod || overrides.method || 'CASH',
    gatewayProvider: overrides.gatewayProvider || 'OFFLINE',
    reconciliationStatus: overrides.reconciliationStatus || 'MATCHED',
    status: PaymentStatus.SUCCESS,
    paymentDate: new Date(),
    ...overrides,
  });
}

// ============================================================================
// 11. Library Factories
// ============================================================================
export async function createBook(tenantId: Types.ObjectId, schoolId: Types.ObjectId, overrides: Record<string, any> = {}) {
  const n = nextSeq();
  return Book.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    title: `Educational Book ${n}`,
    isbn: `978-0-${n}-${n % 10}`,
    author: `Author ${n}`,
    category: 'Science',
    totalCopies: 5,
    availableCopies: 5,
    ...overrides,
  });
}

export async function createBookCopy(tenantId: Types.ObjectId, bookId: Types.ObjectId, overrides: Record<string, any> = {}) {
  const n = nextSeq();
  return BookCopy.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId: overrides.schoolId || new Types.ObjectId(),
    libraryId: overrides.libraryId || new Types.ObjectId(),
    bookId,
    accessionNumber: overrides.accessionNumber || `ACC-${n}`,
    barcode: `BC-${n}`,
    status: overrides.status || BookCopyStatus.AVAILABLE,
    condition: overrides.condition || 'NEW',
    ...overrides,
  });
}

export async function createLibraryMember(tenantId: Types.ObjectId, userId: Types.ObjectId, overrides: Record<string, any> = {}) {
  const n = nextSeq();
  return LibraryMember.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId: overrides.schoolId || new Types.ObjectId(),
    userId,
    memberNumber: overrides.memberNumber || overrides.membershipNumber || `LIB-${n}`,
    memberType: overrides.memberType || 'STUDENT',
    status: overrides.status || 'ACTIVE',
    maxBooks: overrides.maxBooks ?? overrides.maxAllowedBooks ?? 3,
    ...overrides,
  });
}

// ============================================================================
// 12. Transport Factories
// ============================================================================
export async function createVehicle(tenantId: Types.ObjectId, schoolId: Types.ObjectId, overrides: Record<string, any> = {}) {
  const n = nextSeq();
  return Vehicle.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    registrationNumber: `BUS-${n}`,
    type: VehicleType.BUS,
    capacity: 40,
    status: 'ACTIVE',
    ...overrides,
  });
}

export async function createTransportRoute(tenantId: Types.ObjectId, schoolId: Types.ObjectId, overrides: Record<string, any> = {}) {
  const n = nextSeq();
  return TransportRoute.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    name: `Route ${n}`,
    code: `RT-${n}`,
    stops: [],
    isActive: true,
    ...overrides,
  });
}

// ============================================================================
// 13. Hostel Factories
// ============================================================================
export async function createHostel(tenantId: Types.ObjectId, schoolId: Types.ObjectId, overrides: Record<string, any> = {}) {
  const n = nextSeq();
  return Hostel.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    name: `Hostel ${n}`,
    code: `HST-${n}`,
    type: HostelType.BOYS,
    capacity: 100,
    status: 'ACTIVE',
    ...overrides,
  });
}

export async function createHostelRoom(tenantId: Types.ObjectId, hostelId: Types.ObjectId, overrides: Record<string, any> = {}) {
  const n = nextSeq();
  return HostelRoom.create({
    _id: new Types.ObjectId(),
    tenantId,
    hostelId,
    roomNumber: `Room-${n}`,
    floor: 1,
    capacity: 2,
    status: 'AVAILABLE',
    ...overrides,
  });
}

export async function createHostelBed(tenantId: Types.ObjectId, roomId: Types.ObjectId, overrides: Record<string, any> = {}) {
  const n = nextSeq();
  return HostelBed.create({
    _id: new Types.ObjectId(),
    tenantId,
    roomId,
    bedNumber: `Bed-${n}`,
    status: BedStatus.AVAILABLE,
    ...overrides,
  });
}

// ============================================================================
// 14. Inventory Factories
// ============================================================================
export async function createInventoryStore(tenantId: Types.ObjectId, schoolId: Types.ObjectId, overrides: Record<string, any> = {}) {
  const n = nextSeq();
  return InventoryStore.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    name: `Main Store ${n}`,
    code: `STR-${n}`,
    status: 'ACTIVE',
    ...overrides,
  });
}

export async function createInventoryItem(tenantId: Types.ObjectId, storeId: Types.ObjectId, overrides: Record<string, any> = {}) {
  const n = nextSeq();
  return InventoryItem.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId: overrides.schoolId || new Types.ObjectId(),
    storeId,
    name: overrides.name || `Inventory Item ${n}`,
    itemCode: overrides.itemCode || overrides.code || `ITEM-${n}`,
    categoryId: overrides.categoryId || new Types.ObjectId(),
    unitId: overrides.unitId || new Types.ObjectId(),
    itemType: overrides.itemType || 'CONSUMABLE',
    reorderLevel: overrides.reorderLevel || 20,
    minimumStock: overrides.minimumStock || 10,
    ...overrides,
  });
}

// ============================================================================
// 15. Notification & Audit Log Factories
// ============================================================================
export async function createNotification(tenantId: Types.ObjectId, recipientId: Types.ObjectId, overrides: Record<string, any> = {}) {
  const n = nextSeq();
  return Notification.create({
    _id: new Types.ObjectId(),
    tenantId,
    recipientId,
    category: overrides.category || 'ANNOUNCEMENT',
    eventType: overrides.eventType || 'ANNOUNCEMENT_PUBLISHED',
    title: overrides.title || `Notice ${n}`,
    body: overrides.body || overrides.message || `This is a test notification message ${n}`,
    priority: overrides.priority || 'NORMAL',
    status: overrides.status || 'DELIVERED',
    ...overrides,
  });
}

export async function createAuditLog(tenantId: Types.ObjectId, overrides: Record<string, any> = {}) {
  const n = nextSeq();
  return AuditLog.create({
    _id: new Types.ObjectId(),
    tenantId,
    actorType: overrides.actorType || 'USER',
    actorId: overrides.actorId || new Types.ObjectId(),
    action: overrides.action || 'CREATE',
    entity: overrides.entity || 'Student',
    entityId: overrides.entityId || new Types.ObjectId().toString(),
    status: overrides.status || 'SUCCESS',
    details: overrides.details || { reason: `Test audit action ${n}` },
    timestamp: new Date(),
    ...overrides,
  });
}

export async function createAnnouncement(
  tenantId: Types.ObjectId,
  schoolId: Types.ObjectId,
  authorId: Types.ObjectId,
  overrides: Record<string, any> = {}
) {
  const n = nextSeq();
  return Announcement.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId,
    title: overrides.title || `Announcement ${n}`,
    content: overrides.content || `Important announcement details for school notice ${n}`,
    category: overrides.category || 'GENERAL',
    priority: overrides.priority || 'NORMAL',
    status: overrides.status || 'PUBLISHED',
    targetAudience: overrides.targetAudience || { isAll: true },
    authorId,
    publishedAt: overrides.publishedAt || new Date(),
    publishAt: overrides.publishAt || new Date(),
    ...overrides,
  });
}

