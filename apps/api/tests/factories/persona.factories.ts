import { Types } from 'mongoose';
import { User, Role, Session, UserRole } from '@edusphere/database';
import { UserType, UserStatus } from '@edusphere/common';
import { tokenService } from '../../src/modules/auth/token.service.js';
import { sessionService } from '../../src/modules/auth/session.service.js';
import { passwordService } from '../../src/modules/auth/password.service.js';

export interface PersonaResult {
  user: any;
  session: any;
  token: string;
  role: any;
  permissions: string[];
}

export interface PersonaOptions {
  schoolId?: Types.ObjectId;
  overrides?: Record<string, any>;
  customPermissions?: string[];
}

let personaCounter = 5000;
const nextId = () => ++personaCounter;

const PERSONA_DEFAULTS: Record<string, { userType: UserType; permissions: string[] }> = {
  SUPER_ADMIN: {
    userType: UserType.SUPER_ADMIN,
    permissions: ['*'],
  },
  SCHOOL_ADMIN: {
    userType: UserType.SCHOOL_ADMIN,
    permissions: [
      'tenant:read', 'tenant:update', 'school:read', 'school:update',
      'campus:read', 'campus:create', 'campus:update', 'campus:delete',
      'academic_year:read', 'academic_year:create', 'academic_year:activate',
      'class:read', 'class:create', 'section:read', 'section:create',
      'student:read', 'student:create', 'student:update', 'student:delete',
      'guardian:read', 'guardian:create', 'enrollment:read', 'enrollment:create',
      'employee:read', 'employee:create', 'teacher:read', 'teacher:create',
      'attendance:read', 'attendance:create', 'attendance:approve', 'attendance:lock',
      'assignment:read', 'assignment:create', 'assignment:publish',
      'exam:read', 'exam:create', 'result:read', 'result:approve', 'result:publish',
      'fee:read', 'fee:create', 'invoice:read', 'invoice:create', 'payment:read', 'payment:create',
      'fee_category:read', 'fee_category:create', 'fee_category:update', 'fee_category:delete',
      'fee_structure:read', 'fee_structure:create', 'fee_structure:update', 'fee_structure:delete',
      'fee_assignment:read', 'fee_assignment:create',
      'fee_invoice:read', 'fee_invoice:create', 'fee_invoice:void',
      'payment:collect', 'payment:refund', 'income_expense:manage', 'finance_report:read',
      'payroll:read', 'payroll:calculate', 'payroll:approve',
      'library:read', 'book:read', 'book:create',
      'transport:read', 'vehicle:read', 'hostel:read', 'inventory:read',
      'notification:read', 'announcement:create', 'audit:read', 'search:read', 'report:read', 'export:create',
    ],
  },
  PRINCIPAL: {
    userType: UserType.SCHOOL_ADMIN,
    permissions: [
      'school:read', 'campus:read', 'academic_year:read',
      'student:read', 'employee:read', 'teacher:read',
      'attendance:read', 'attendance:approve',
      'exam:read', 'result:approve', 'result:publish',
      'fee:read', 'invoice:read', 'payroll:read',
      'audit:read', 'report:read', 'announcement:create',
    ],
  },
  VICE_PRINCIPAL: {
    userType: UserType.STAFF,
    permissions: [
      'student:read', 'employee:read', 'teacher:read',
      'attendance:read', 'attendance:approve',
      'exam:read', 'result:read', 'report:read',
    ],
  },
  TEACHER: {
    userType: UserType.TEACHER,
    permissions: [
      'student:read', 'attendance:read', 'attendance:create',
      'assignment:read', 'assignment:create', 'assignment:publish', 'assignment:grade',
      'exam:read', 'marks:enter', 'result:read',
      'timetable:read', 'notification:read',
    ],
  },
  ACCOUNTANT: {
    userType: UserType.STAFF,
    permissions: [
      'student:read', 'fee:read', 'fee:create',
      'invoice:read', 'invoice:create', 'payment:read', 'payment:create', 'refund:create',
      'report:read',
    ],
  },
  HR_MANAGER: {
    userType: UserType.STAFF,
    permissions: [
      'employee:read', 'employee:create', 'employee:update',
      'leave:read', 'leave:approve',
      'payroll:read', 'payroll:calculate', 'payroll:approve', 'payroll:process',
      'report:read',
    ],
  },
  LIBRARIAN: {
    userType: UserType.STAFF,
    permissions: [
      'student:read', 'book:read', 'book:create', 'book:update',
      'circulation:checkout', 'circulation:checkin', 'fine:waive',
      'report:read',
    ],
  },
  TRANSPORT_MANAGER: {
    userType: UserType.STAFF,
    permissions: [
      'student:read', 'transport:read', 'vehicle:read', 'vehicle:create',
      'route:read', 'route:create', 'transport_trip:create',
      'report:read',
    ],
  },
  HOSTEL_MANAGER: {
    userType: UserType.STAFF,
    permissions: [
      'student:read', 'hostel:read', 'hostel:create',
      'hostel:allocation', 'hostel:outing', 'hostel:attendance',
      'report:read',
    ],
  },
  RECEPTIONIST: {
    userType: UserType.STAFF,
    permissions: [
      'student:read', 'visitor:manage', 'enquiry:manage',
    ],
  },
  STAFF: {
    userType: UserType.STAFF,
    permissions: [
      'notification:read', 'leave:apply', 'payslip:read',
    ],
  },
  STUDENT: {
    userType: UserType.STUDENT,
    permissions: [
      'student:read:self', 'attendance:read:self', 'assignment:read', 'assignment:submit',
      'result:read:self', 'fee:read:self', 'library:read:self', 'notification:read',
    ],
  },
  PARENT: {
    userType: UserType.PARENT,
    permissions: [
      'student:read:ward', 'attendance:read:ward', 'assignment:read:ward',
      'result:read:ward', 'fee:read:ward', 'invoice:read:ward', 'payment:create',
      'library:read:ward', 'transport:read:ward', 'hostel:read:ward', 'notification:read',
    ],
  },
};

export async function createPersonaUser(
  personaName: keyof typeof PERSONA_DEFAULTS,
  tenantId: Types.ObjectId,
  options: PersonaOptions = {}
): Promise<PersonaResult> {
  const n = nextId();
  const config = PERSONA_DEFAULTS[personaName] || { userType: UserType.STAFF, permissions: [] };
  const permissions = options.customPermissions || config.permissions;

  // 1. Create or Find Role
  let role = await Role.findOne({ tenantId, name: String(personaName) });
  if (!role) {
    role = await Role.create({
      _id: new Types.ObjectId(),
      tenantId,
      name: String(personaName),
      code: String(personaName),
      description: `Persona Role ${personaName}`,
      userType: config.userType,
      isSystem: true,
    });
  }

  const passwordHash = await passwordService.hashPassword('P@ssword123!');

  // 2. Create User
  const user = await User.create({
    _id: new Types.ObjectId(),
    tenantId,
    schoolId: options.schoolId,
    email: `${String(personaName).toLowerCase()}_${n}@test.edu`,
    passwordHash,
    userType: config.userType,
    status: UserStatus.ACTIVE,
    isSuperAdmin: personaName === 'SUPER_ADMIN',
    ...(options.overrides || {}),
  });

  // 3. UserRole mapping
  await UserRole.create({
    tenantId,
    userId: user._id,
    roleId: role._id,
    schoolId: options.schoolId,
  });

  // 4. Session
  const sessionRes = await sessionService.createSession({
    userId: user._id,
    tenantId,
    deviceName: `Test Runner Persona ${personaName}`,
  });
  const session = sessionRes.session;

  // 5. Access Token
  const token = tokenService.generateAccessToken({
    sub: user._id.toString(),
    userId: user._id.toString(),
    tenantId: tenantId.toString(),
    schoolId: options.schoolId?.toString(),
    userType: config.userType,
    sessionId: session._id.toString(),
    roles: [String(personaName)],
    permissions,
  });

  return {
    user,
    session,
    token,
    role,
    permissions,
  };
}

export const persona = {
  superAdmin: (tenantId: Types.ObjectId, opts?: PersonaOptions) => createPersonaUser('SUPER_ADMIN', tenantId, opts),
  schoolAdmin: (tenantId: Types.ObjectId, opts?: PersonaOptions) => createPersonaUser('SCHOOL_ADMIN', tenantId, opts),
  principal: (tenantId: Types.ObjectId, opts?: PersonaOptions) => createPersonaUser('PRINCIPAL', tenantId, opts),
  vicePrincipal: (tenantId: Types.ObjectId, opts?: PersonaOptions) => createPersonaUser('VICE_PRINCIPAL', tenantId, opts),
  teacher: (tenantId: Types.ObjectId, opts?: PersonaOptions) => createPersonaUser('TEACHER', tenantId, opts),
  accountant: (tenantId: Types.ObjectId, opts?: PersonaOptions) => createPersonaUser('ACCOUNTANT', tenantId, opts),
  hrManager: (tenantId: Types.ObjectId, opts?: PersonaOptions) => createPersonaUser('HR_MANAGER', tenantId, opts),
  librarian: (tenantId: Types.ObjectId, opts?: PersonaOptions) => createPersonaUser('LIBRARIAN', tenantId, opts),
  transportManager: (tenantId: Types.ObjectId, opts?: PersonaOptions) => createPersonaUser('TRANSPORT_MANAGER', tenantId, opts),
  hostelManager: (tenantId: Types.ObjectId, opts?: PersonaOptions) => createPersonaUser('HOSTEL_MANAGER', tenantId, opts),
  receptionist: (tenantId: Types.ObjectId, opts?: PersonaOptions) => createPersonaUser('RECEPTIONIST', tenantId, opts),
  staff: (tenantId: Types.ObjectId, opts?: PersonaOptions) => createPersonaUser('STAFF', tenantId, opts),
  student: (tenantId: Types.ObjectId, opts?: PersonaOptions) => createPersonaUser('STUDENT', tenantId, opts),
  parent: (tenantId: Types.ObjectId, opts?: PersonaOptions) => createPersonaUser('PARENT', tenantId, opts),
};
