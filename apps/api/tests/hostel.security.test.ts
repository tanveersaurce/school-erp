import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
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
  Student,
  Parent,
  StudentParentRelation,
  Hostel,
  HostelBuilding,
  HostelFloor,
  HostelRoomType,
  Room,
  Bed,
  HostelAllocation,
  HostelOuting,
} from '@edusphere/database';
import {
  TenantStatus,
  TenantPlan,
  TenantBillingStatus,
  UserType,
  UserStatus,
  StudentStatus,
  Gender,
  RoomTypeCategory,
  RoomStatus,
  BedStatus,
  HostelType,
  HostelAllocationStatus,
  HostelOutingStatus,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 17: Hostel Security, Multi-Tenancy, RBAC & Anti-IDOR Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  // Tenant A
  const tenantAId = new Types.ObjectId();
  const schoolAId = new Types.ObjectId();
  const campusAId = new Types.ObjectId();
  const academicYearAId = new Types.ObjectId();
  const hostHeaderA = 'tenanta.edusphere.io';

  // Tenant B
  const tenantBId = new Types.ObjectId();
  const schoolBId = new Types.ObjectId();
  const campusBId = new Types.ObjectId();
  const academicYearBId = new Types.ObjectId();
  const hostHeaderB = 'tenantb.edusphere.io';

  // Auth tokens
  let adminTokenA: string;
  let adminTokenB: string;
  let studentTokenA: string;
  let studentTokenB: string;
  let parentTokenA: string;
  let parentTokenB: string;

  // Tenant A Entities
  let hostelAId: string;
  let roomAId: string;
  let bedAId: string;
  let studentAId: string;
  let studentBId: string;
  let allocationAId: string;
  let outingAId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    await Hostel.init();
    await HostelBuilding.init();
    await HostelFloor.init();
    await HostelRoomType.init();
    await Room.init();
    await Bed.init();
    await HostelAllocation.init();
    await HostelOuting.init();

    // 1. Seed Tenants
    await Tenant.create([
      { _id: tenantAId, name: 'Tenant A Academy', slug: 'tenanta', status: TenantStatus.ACTIVE, plan: TenantPlan.ENTERPRISE, billingStatus: TenantBillingStatus.ACTIVE },
      { _id: tenantBId, name: 'Tenant B Academy', slug: 'tenantb', status: TenantStatus.ACTIVE, plan: TenantPlan.ENTERPRISE, billingStatus: TenantBillingStatus.ACTIVE },
    ]);

    await School.create([
      { _id: schoolAId, tenantId: tenantAId, name: 'School A', code: 'SCH_A', currency: 'USD', timezone: 'UTC', affiliationBoard: 'CBSE' },
      { _id: schoolBId, tenantId: tenantBId, name: 'School B', code: 'SCH_B', currency: 'USD', timezone: 'UTC', affiliationBoard: 'CBSE' },
    ]);

    await Campus.create([
      {
        _id: campusAId,
        tenantId: tenantAId,
        schoolId: schoolAId,
        name: 'Campus A',
        code: 'CMP_A',
        address: { street: '100 Alpha St', city: 'CityA', state: 'NY', postalCode: '10001', country: 'USA' },
      },
      {
        _id: campusBId,
        tenantId: tenantBId,
        schoolId: schoolBId,
        name: 'Campus B',
        code: 'CMP_B',
        address: { street: '200 Beta St', city: 'CityB', state: 'NY', postalCode: '10002', country: 'USA' },
      },
    ]);

    await AcademicYear.create([
      { _id: academicYearAId, tenantId: tenantAId, schoolId: schoolAId, campusId: campusAId, name: '2026-2027', code: 'AY-A', startDate: new Date('2026-06-01'), endDate: new Date('2027-05-31'), isCurrent: true },
      { _id: academicYearBId, tenantId: tenantBId, schoolId: schoolBId, campusId: campusBId, name: '2026-2027', code: 'AY-B', startDate: new Date('2026-06-01'), endDate: new Date('2027-05-31'), isCurrent: true },
    ]);

    // 2. Permissions & Roles
    const permDocs = await Permission.insertMany(SYSTEM_PERMISSIONS);
    const permMap = new Map<string, Types.ObjectId>();
    permDocs.forEach((p) => permMap.set(p.permissionString, p._id));

    // Seed roles for Tenant A
    const rolesA: any[] = [];
    const rolePermsA: any[] = [];
    for (const r of SYSTEM_ROLES) {
      const roleId = new Types.ObjectId();
      rolesA.push({
        _id: roleId,
        tenantId: tenantAId,
        name: r.name,
        code: r.code,
        description: r.description,
        isSystem: r.isSystem,
      });
      for (const pCode of r.permissions) {
        const pId = permMap.get(pCode);
        if (pId) {
          rolePermsA.push({ tenantId: tenantAId, roleId, permissionId: pId });
        }
      }
    }
    await Role.insertMany(rolesA);
    await RolePermission.insertMany(rolePermsA);

    // Seed roles for Tenant B
    const rolesB: any[] = [];
    const rolePermsB: any[] = [];
    for (const r of SYSTEM_ROLES) {
      const roleId = new Types.ObjectId();
      rolesB.push({
        _id: roleId,
        tenantId: tenantBId,
        name: r.name,
        code: r.code,
        description: r.description,
        isSystem: r.isSystem,
      });
      for (const pCode of r.permissions) {
        const pId = permMap.get(pCode);
        if (pId) {
          rolePermsB.push({ tenantId: tenantBId, roleId, permissionId: pId });
        }
      }
    }
    await Role.insertMany(rolesB);
    await RolePermission.insertMany(rolePermsB);

    const roleMapA = new Map<string, Types.ObjectId>();
    rolesA.forEach((r) => roleMapA.set(r.name, r._id));

    const roleMapB = new Map<string, Types.ObjectId>();
    rolesB.forEach((r) => roleMapB.set(r.name, r._id));

    const defaultPassword = 'SecurePassword123!';
    const passwordHash = await passwordService.hashPassword(defaultPassword);

    // 3. Admin Users
    const adminUserA = await User.create({
      _id: new Types.ObjectId(),
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      email: 'admin@tenanta.edu',
      passwordHash,
      userType: UserType.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({ tenantId: tenantAId, userId: adminUserA._id, roleId: roleMapA.get('SUPER_ADMIN')! });

    const adminUserB = await User.create({
      _id: new Types.ObjectId(),
      tenantId: tenantBId,
      schoolId: schoolBId,
      campusId: campusBId,
      email: 'admin@tenantb.edu',
      passwordHash,
      userType: UserType.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({ tenantId: tenantBId, userId: adminUserB._id, roleId: roleMapB.get('SUPER_ADMIN')! });

    // 4. Students in Tenant A
    const studentAUser = await User.create({
      _id: new Types.ObjectId(),
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      email: 'studenta@tenanta.edu',
      passwordHash,
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({ tenantId: tenantAId, userId: studentAUser._id, roleId: roleMapA.get('STUDENT')! });

    const studentADoc = await Student.create({
      _id: new Types.ObjectId(),
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      userId: studentAUser._id,
      admissionNumber: 'ADM-STU-A',
      studentId: 'STU-A',
      admissionDate: new Date('2026-06-15'),
      personalDetails: { firstName: 'Alice', lastName: 'TenantA', dateOfBirth: new Date('2008-04-10'), gender: Gender.FEMALE },
      contactDetails: { primaryEmail: 'studenta@tenanta.edu', primaryPhone: '1112223333', currentAddress: { street: '1 St' } },
      currentStatus: StudentStatus.ACTIVE,
    });
    studentAId = studentADoc._id.toString();

    const studentBUser = await User.create({
      _id: new Types.ObjectId(),
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      email: 'studentb@tenanta.edu',
      passwordHash,
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({ tenantId: tenantAId, userId: studentBUser._id, roleId: roleMapA.get('STUDENT')! });

    const studentBDoc = await Student.create({
      _id: new Types.ObjectId(),
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      userId: studentBUser._id,
      admissionNumber: 'ADM-STU-B',
      studentId: 'STU-B',
      admissionDate: new Date('2026-06-15'),
      personalDetails: { firstName: 'Bob', lastName: 'TenantA', dateOfBirth: new Date('2008-05-20'), gender: Gender.MALE },
      contactDetails: { primaryEmail: 'studentb@tenanta.edu', primaryPhone: '4445556666', currentAddress: { street: '2 St' } },
      currentStatus: StudentStatus.ACTIVE,
    });
    studentBId = studentBDoc._id.toString();

    // 5. Parents in Tenant A
    const parentAUser = await User.create({
      _id: new Types.ObjectId(),
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      email: 'parenta@tenanta.edu',
      passwordHash,
      userType: UserType.PARENT,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({ tenantId: tenantAId, userId: parentAUser._id, roleId: roleMapA.get('PARENT')! });

    const parentADoc = await Parent.create({
      tenantId: tenantAId,
      userId: parentAUser._id,
      guardianId: 'GRD-A-01',
      personalDetails: { firstName: 'ParentOf', lastName: 'Alice' },
      contactDetails: {
        email: 'parenta@tenanta.edu',
        phone: '1112223333',
        address: { addressLine1: '123 A St', city: 'CityA', state: 'NY', postalCode: '10001', country: 'USA' },
      },
    });
    // Link Parent A -> Student A only
    await StudentParentRelation.create({
      tenantId: tenantAId,
      studentId: studentADoc._id,
      parentId: parentADoc._id,
      relationshipType: 'MOTHER',
      isEmergencyContact: true,
      status: 'ACTIVE',
    });

    const parentBUser = await User.create({
      _id: new Types.ObjectId(),
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      email: 'parentb@tenanta.edu',
      passwordHash,
      userType: UserType.PARENT,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({ tenantId: tenantAId, userId: parentBUser._id, roleId: roleMapA.get('PARENT')! });

    const parentBDoc = await Parent.create({
      tenantId: tenantAId,
      userId: parentBUser._id,
      guardianId: 'GRD-A-02',
      personalDetails: { firstName: 'ParentOf', lastName: 'Bob' },
      contactDetails: {
        email: 'parentb@tenanta.edu',
        phone: '4445556666',
        address: { addressLine1: '456 B St', city: 'CityA', state: 'NY', postalCode: '10001', country: 'USA' },
      },
    });
    // Link Parent B -> Student B only
    await StudentParentRelation.create({
      tenantId: tenantAId,
      studentId: studentBDoc._id,
      parentId: parentBDoc._id,
      relationshipType: 'FATHER',
      isEmergencyContact: true,
      status: 'ACTIVE',
    });

    // 6. Tenant A Hostel, Room, Bed, Allocation, Outing
    const hostelA = await Hostel.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      name: 'North Residence Hall',
      code: 'NRH-A',
      type: HostelType.GIRLS,
      capacity: 1,
    });
    hostelAId = hostelA._id.toString();

    const roomA = await Room.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      hostelId: hostelA._id,
      roomNumber: 'A-101',
      floor: 1,
      capacity: 1,
      occupiedBedsCount: 1,
      status: RoomStatus.FULL,
    });
    roomAId = roomA._id.toString();

    const bedA = await Bed.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      hostelId: hostelA._id,
      roomId: roomA._id,
      bedNumber: 'B-01',
      code: 'A-101-B-01',
      status: BedStatus.OCCUPIED,
      isOccupied: true,
      currentStudentId: studentADoc._id,
    });
    bedAId = bedA._id.toString();

    const allocA = await HostelAllocation.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      studentId: studentADoc._id,
      academicYearId: academicYearAId,
      hostelId: hostelA._id,
      roomId: roomA._id,
      bedId: bedA._id,
      status: HostelAllocationStatus.CHECKED_IN,
      allocationDate: new Date(),
      actualCheckInDate: new Date(),
    });
    allocationAId = allocA._id.toString();

    const outingA = await HostelOuting.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      studentId: studentADoc._id,
      hostelId: hostelA._id,
      startDateTime: new Date(),
      expectedReturnDateTime: new Date(Date.now() + 3600000),
      reason: 'Academic competition visit',
      destination: 'Downtown Convention Hall',
      status: HostelOutingStatus.REQUESTED,
    });
    outingAId = outingA._id.toString();

    // 7. Acquire Access Tokens
    const [resAdminA, resAdminB, resStuA, resStuB, resParA, resParB] = await Promise.all([
      request(app).post('/api/v1/auth/login').set('Host', hostHeaderA).send({ email: 'admin@tenanta.edu', password: defaultPassword }),
      request(app).post('/api/v1/auth/login').set('Host', hostHeaderB).send({ email: 'admin@tenantb.edu', password: defaultPassword }),
      request(app).post('/api/v1/auth/login').set('Host', hostHeaderA).send({ email: 'studenta@tenanta.edu', password: defaultPassword }),
      request(app).post('/api/v1/auth/login').set('Host', hostHeaderA).send({ email: 'studentb@tenanta.edu', password: defaultPassword }),
      request(app).post('/api/v1/auth/login').set('Host', hostHeaderA).send({ email: 'parenta@tenanta.edu', password: defaultPassword }),
      request(app).post('/api/v1/auth/login').set('Host', hostHeaderA).send({ email: 'parentb@tenanta.edu', password: defaultPassword }),
    ]);

    adminTokenA = resAdminA.body.data.accessToken || resAdminA.body.data.tokens?.accessToken;
    adminTokenB = resAdminB.body.data.accessToken || resAdminB.body.data.tokens?.accessToken;
    studentTokenA = resStuA.body.data.accessToken || resStuA.body.data.tokens?.accessToken;
    studentTokenB = resStuB.body.data.accessToken || resStuB.body.data.tokens?.accessToken;
    parentTokenA = resParA.body.data.accessToken || resParA.body.data.tokens?.accessToken;
    parentTokenB = resParB.body.data.accessToken || resParB.body.data.tokens?.accessToken;
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  }, 60000);

  // =========================================================================
  // 1. Multi-Tenant Isolation Tests
  // =========================================================================

  it('1. Strict Multi-Tenant Isolation: Tenant B admin cannot access Tenant A hostel by ID', async () => {
    const res = await request(app)
      .get(`/api/v1/hostel/hostels/${hostelAId}`)
      .set('Host', hostHeaderB)
      .set('Authorization', `Bearer ${adminTokenB}`);

    expect(res.status).toBe(404);
  });

  it('2. Strict Multi-Tenant Isolation: Tenant B admin listing hostels sees 0 hostels from Tenant A', async () => {
    const res = await request(app)
      .get('/api/v1/hostel/hostels')
      .set('Host', hostHeaderB)
      .set('Authorization', `Bearer ${adminTokenB}`);

    expect(res.status).toBe(200);
    const items = res.body.data?.data || res.body.data;
    expect(items.length).toBe(0);
  });

  it('3. Strict Multi-Tenant Isolation: Tenant B admin cannot view Tenant A room or bed', async () => {
    const roomRes = await request(app)
      .get(`/api/v1/hostel/rooms/${roomAId}`)
      .set('Host', hostHeaderB)
      .set('Authorization', `Bearer ${adminTokenB}`);

    expect(roomRes.status).toBe(404);

    const bedRes = await request(app)
      .get(`/api/v1/hostel/beds/${bedAId}`)
      .set('Host', hostHeaderB)
      .set('Authorization', `Bearer ${adminTokenB}`);

    expect(bedRes.status).toBe(404);
  });

  // =========================================================================
  // 2. Anti-IDOR Student & Parent Access Tests
  // =========================================================================

  it('4. Anti-IDOR Student Isolation: Student A can view their own hostel accommodation details', async () => {
    const res = await request(app)
      .get('/api/v1/hostel/my')
      .set('Host', hostHeaderA)
      .set('Authorization', `Bearer ${studentTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.allocation._id.toString()).toBe(allocationAId);
    expect(res.body.data.bed.bedNumber).toBe('B-01');
    expect(res.body.data.room.roomNumber).toBe('A-101');
  });

  it('5. Anti-IDOR Student Isolation: Student B (unallocated) sees no active hostel accommodation', async () => {
    const res = await request(app)
      .get('/api/v1/hostel/my')
      .set('Host', hostHeaderA)
      .set('Authorization', `Bearer ${studentTokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.data.allocation).toBeNull();
  });

  it('6. Anti-IDOR Outing Protection: Student B cannot request an outing for Student A', async () => {
    const res = await request(app)
      .post('/api/v1/hostel/outings')
      .set('Host', hostHeaderA)
      .set('Authorization', `Bearer ${studentTokenB}`)
      .send({
        hostelId: hostelAId,
        studentId: studentAId, // Attempting IDOR to request outing for Alice
        startDateTime: new Date(),
        expectedReturnDateTime: new Date(Date.now() + 3600000),
        reason: 'Impersonated outing request',
        destination: 'Mall',
      });

    // Blocked by anti-IDOR policy with 403 Forbidden
    expect(res.status).toBe(403);
  });

  it('7. Anti-IDOR Parent-Child Isolation: Parent A can view their linked child accommodation', async () => {
    const res = await request(app)
      .get(`/api/v1/hostel/my?studentId=${studentAId}`)
      .set('Host', hostHeaderA)
      .set('Authorization', `Bearer ${parentTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.allocation).toBeDefined();
    expect(res.body.data.allocation.studentId.toString()).toBe(studentAId);
  });

  it('8. Anti-IDOR Parent-Child Isolation: Parent B is forbidden from accessing unlinked Student A accommodation', async () => {
    const res = await request(app)
      .get(`/api/v1/hostel/my?studentId=${studentAId}`)
      .set('Host', hostHeaderA)
      .set('Authorization', `Bearer ${parentTokenB}`);

    // Blocked with 403 Forbidden because Parent B has no relation with Student A
    expect(res.status).toBe(403);
  });

  // =========================================================================
  // 3. RBAC & Unauthorized Role Enforcement
  // =========================================================================

  it('9. RBAC Enforcement: Unauthenticated requests to hostel endpoints are rejected with 401', async () => {
    const res = await request(app)
      .get('/api/v1/hostel/hostels')
      .set('Host', hostHeaderA);

    expect(res.status).toBe(401);
  });

  it('10. RBAC Enforcement: Student cannot create a hostel room (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/hostel/rooms')
      .set('Host', hostHeaderA)
      .set('Authorization', `Bearer ${studentTokenA}`)
      .send({
        hostelId: hostelAId,
        roomNumber: '999',
        floor: 1,
        capacity: 2,
      });

    expect(res.status).toBe(403);
  });

  it('11. RBAC Enforcement: Parent cannot approve an outing (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/v1/hostel/outings/${outingAId}/approve`)
      .set('Host', hostHeaderA)
      .set('Authorization', `Bearer ${parentTokenA}`)
      .send({
        approved: true,
        remarks: 'Parent approval bypass attempt',
      });

    expect(res.status).toBe(403);
  });
});
