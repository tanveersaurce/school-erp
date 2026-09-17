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
  Employee,
  Department,
  Designation,
  Hostel,
  HostelBuilding,
  HostelFloor,
  HostelRoomType,
  Room,
  Bed,
  HostelStaffAssignment,
  HostelAllocation,
  HostelAttendance,
  HostelOuting,
  HostelIncident,
  HostelRoomInspection,
  HostelMaintenance,
  HostelFeeAssignment,
} from '@edusphere/database';
import {
  TenantStatus,
  TenantPlan,
  TenantBillingStatus,
  UserType,
  UserStatus,
  StudentStatus,
  Gender,
  EmploymentType,
  EmploymentStatus,
  StaffDocumentType,
  BedStatus,
  RoomStatus,
  HostelAllocationStatus,
  HostelTransferReason,
  HostelAttendanceStatus,
  HostelOutingStatus,
  HostelIncidentType,
  HostelIncidentSeverity,
  HostelIncidentStatus,
  HostelMaintenanceCategory,
  HostelMaintenancePriority,
  HostelMaintenanceStatus,
  HostelBillingFrequency,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 17: Hostel Management Full Lifecycle Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();
  const hostHeader = 'management-hostel.edusphere.io';

  let adminToken: string;
  let hostelId: string;
  let buildingId: string;
  let floorId: string;
  let roomTypeId: string;
  let roomId: string;
  let bed1Id: string;
  let bed2Id: string;
  let bed3Id: string;
  let wardenEmployeeId: string;
  let studentId: string;
  let allocationId: string;
  let transferredAllocationId: string;
  let outingId: string;
  let incidentId: string;
  let maintenanceId: string;
  let feeAssignmentId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    await Hostel.init();
    await HostelBuilding.init();
    await Room.init();
    await Bed.init();
    await HostelAllocation.init();
    await HostelAttendance.init();
    await HostelOuting.init();
    await HostelIncident.init();
    await HostelRoomInspection.init();
    await HostelMaintenance.init();
    await HostelFeeAssignment.init();

    // 1. Seed Tenant, School, Campus, AcademicYear
    await Tenant.create({
      _id: tenantId,
      name: 'Hostel Management Academy',
      slug: 'management-hostel',
      customDomain: hostHeader,
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      contact: { email: 'admin@hostelmgmt.edu', phone: '+1234567890' },
    });

    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Hostel Mgmt High',
      code: 'HMH-01',
      status: 'ACTIVE',
      currency: 'USD',
      timezone: 'UTC',
      affiliationBoard: 'CBSE',
    });

    await Campus.create({
      _id: campusId,
      tenantId,
      schoolId,
      name: 'Central Campus',
      code: 'MAIN',
      isPrimary: true,
      status: 'ACTIVE',
      address: { street: '500 Boarding Way', city: 'Metro', state: 'NY', postalCode: '10001', country: 'USA' },
    });

    await AcademicYear.create({
      _id: academicYearId,
      tenantId,
      schoolId,
      campusId,
      name: '2026-2027',
      code: 'AY26-27',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
    });

    // 2. Permissions & Roles
    const permDocs = await Permission.insertMany(SYSTEM_PERMISSIONS);
    const permMap = new Map<string, Types.ObjectId>();
    for (const p of permDocs) {
      permMap.set(p.permissionString.toLowerCase().trim(), p._id as Types.ObjectId);
    }

    const roleDocs = await Role.insertMany(
      SYSTEM_ROLES.map((r) => ({
        tenantId,
        name: r.name,
        description: r.description,
        isSystemRole: true,
      }))
    );
    const roleMap = new Map<string, Types.ObjectId>();
    for (const r of roleDocs) {
      roleMap.set(r.name, r._id as Types.ObjectId);
    }

    const rolePerms: any[] = [];
    for (const r of SYSTEM_ROLES) {
      const rId = roleMap.get(r.name);
      if (!rId) continue;
      if (r.permissions.includes('*')) {
        for (const pId of permMap.values()) {
          rolePerms.push({ tenantId, roleId: rId, permissionId: pId });
        }
      } else {
        for (const pStr of r.permissions) {
          const pId = permMap.get(pStr.toLowerCase().trim());
          if (pId) {
            rolePerms.push({ tenantId, roleId: rId, permissionId: pId });
          }
        }
      }
    }
    await RolePermission.insertMany(rolePerms);

    const passwordHash = await passwordService.hashPassword('AdminPassword123!');
    const adminUser = await User.create({
      _id: new Types.ObjectId(),
      tenantId,
      schoolId,
      campusId,
      email: 'hostelmgmtadmin@test.com',
      passwordHash,
      userType: UserType.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });

    await UserRole.create({
      tenantId,
      userId: adminUser._id,
      roleId: roleMap.get('SUPER_ADMIN')!,
    });

    // Login admin
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', hostHeader)
      .send({ email: 'hostelmgmtadmin@test.com', password: 'AdminPassword123!' });

    adminToken = loginRes.body.data.accessToken || loginRes.body.data.tokens?.accessToken;

    // 3. Department, Designation, Employee for Warden
    const dept = await Department.create({
      tenantId,
      schoolId,
      name: 'Hostel & Residence',
      code: 'HOSTEL_DEPT',
    });

    const desig = await Designation.create({
      tenantId,
      schoolId,
      name: 'Chief Warden',
      code: 'CHIEF_WARDEN',
    });

    const warden = await Employee.create({
      tenantId,
      schoolId,
      campusId,
      departmentId: dept._id,
      designationId: desig._id,
      employeeId: 'EMP-WARDEN-01',
      firstName: 'Arthur',
      lastName: 'Pendleton',
      displayName: 'Arthur Pendleton',
      gender: Gender.MALE,
      dateOfBirth: new Date('1980-05-15'),
      workEmail: 'warden@hostelmgmt.edu',
      workPhone: '+1987654321',
      employmentType: EmploymentType.PERMANENT,
      employmentStatus: EmploymentStatus.ACTIVE,
      joiningDate: new Date('2020-01-01'),
      documents: [],
    });
    wardenEmployeeId = warden._id.toString();

    // 4. Student
    const stu = await Student.create({
      tenantId,
      schoolId,
      campusId,
      currentAcademicYearId: academicYearId,
      admissionNumber: 'ADM-HOSTEL-001',
      admissionDate: new Date('2026-06-01'),
      currentStatus: StudentStatus.ACTIVE,
      personalDetails: {
        firstName: 'Marcus',
        lastName: 'Aurelius',
        gender: Gender.MALE,
        dateOfBirth: new Date('2010-04-26'),
      },
      contactDetails: {
        currentAddress: {
          addressLine1: '123 Forum St',
          city: 'Rome',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
        },
      },
    });
    studentId = stu._id.toString();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) {
      await replSet.stop();
    }
  });

  // =========================================================================
  // 1. Structure Creation
  // =========================================================================

  it('1. Creates hostel, building, floor, room type, and room', async () => {
    // 1a. Create Hostel
    const hostelRes = await request(app)
      .post('/api/v1/hostel')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schoolId: schoolId.toString(),
        campusId: campusId.toString(),
        name: 'Olympus Boys Hostel',
        code: 'OLY-01',
        type: 'BOYS',
        description: 'Primary residential facility',
      });
    expect(hostelRes.status).toBe(201);
    hostelId = hostelRes.body.data._id;

    // 1b. Create Building
    const bldRes = await request(app)
      .post('/api/v1/hostel/buildings')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schoolId: schoolId.toString(),
        hostelId,
        name: 'North Wing',
        code: 'NORTH',
        numberOfFloors: 3,
      });
    expect(bldRes.status).toBe(201);
    buildingId = bldRes.body.data._id;

    // 1c. Create Floor
    const flrRes = await request(app)
      .post('/api/v1/hostel/floors')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        hostelId,
        buildingId,
        name: 'First Floor',
        floorNumber: 1,
        code: 'FLR-1',
      });
    expect(flrRes.status).toBe(201);
    floorId = flrRes.body.data._id;

    // 1d. Create Room Type
    const rtRes = await request(app)
      .post('/api/v1/hostel/room-types')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Triple Deluxe Room',
        code: 'TRIPLE_DLX',
        type: 'TRIPLE',
        expectedCapacity: 3,
        baseRateMinorUnits: 45000,
      });
    expect(rtRes.status).toBe(201);
    roomTypeId = rtRes.body.data._id;

    // 1e. Create Room
    const rmRes = await request(app)
      .post('/api/v1/hostel/rooms')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        hostelId,
        buildingId,
        floorId,
        roomTypeId,
        roomNumber: '101',
        floor: 1,
        capacity: 3,
      });
    expect(rmRes.status).toBe(201);
    roomId = rmRes.body.data._id;
  });

  it('2. Batch creates beds and verifies room capacity synchronizes with physical beds', async () => {
    const bedsRes = await request(app)
      .post('/api/v1/hostel/beds/batch')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        roomId,
        bedNumbers: ['A', 'B', 'C'],
      });

    expect(bedsRes.status).toBe(201);
    expect(bedsRes.body.data.length).toBe(3);

    bed1Id = bedsRes.body.data[0]._id;
    bed2Id = bedsRes.body.data[1]._id;
    bed3Id = bedsRes.body.data[2]._id;

    // Verify room has capacity = 3 and status = AVAILABLE
    const room = await Room.findById(roomId);
    expect(room?.capacity).toBe(3);
    expect(room?.occupiedBedsCount).toBe(0);
    expect(room?.status).toBe(RoomStatus.AVAILABLE);

    // Verify hostel capacity
    const hostel = await Hostel.findById(hostelId);
    expect(hostel?.capacity).toBe(3);
  });

  it('3. Assigns warden (Employee 1:1 reuse) and updates hostel primary contact', async () => {
    const staffRes = await request(app)
      .post('/api/v1/hostel/staff')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        hostelId,
        employeeId: wardenEmployeeId,
        role: 'WARDEN',
        startDate: new Date(),
      });

    expect(staffRes.status).toBe(201);

    // Verify hostel updated with warden information
    const hostel = await Hostel.findById(hostelId);
    expect(hostel?.wardenId?.toString()).toBe(wardenEmployeeId);
    expect(hostel?.wardenName).toBe('Arthur Pendleton');
    expect(hostel?.wardenPhone).toBe('+1987654321');
  });

  // =========================================================================
  // 2. Student Boarding Lifecycle
  // =========================================================================

  it('4. Allocates bed 1 to student, checks in, and synchronizes room status', async () => {
    // 4a. Allocate
    const allocRes = await request(app)
      .post('/api/v1/hostel/allocations')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId,
        academicYearId: academicYearId.toString(),
        hostelId,
        roomId,
        bedId: bed1Id,
      });

    expect(allocRes.status).toBe(201);
    allocationId = allocRes.body.data._id;
    expect(allocRes.body.data.status).toBe(HostelAllocationStatus.ALLOCATED);

    // Bed 1 is OCCUPIED
    const b1 = await Bed.findById(bed1Id);
    expect(b1?.status).toBe(BedStatus.OCCUPIED);
    expect(b1?.currentStudentId?.toString()).toBe(studentId);

    // Room is PARTIALLY_OCCUPIED (1/3)
    const room = await Room.findById(roomId);
    expect(room?.occupiedBedsCount).toBe(1);
    expect(room?.status).toBe(RoomStatus.PARTIALLY_OCCUPIED);

    // 4b. Check-in
    const checkinRes = await request(app)
      .post(`/api/v1/hostel/allocations/${allocationId}/check-in`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        checkInDate: new Date(),
      });

    expect(checkinRes.status).toBe(200);
    expect(checkinRes.body.data.status).toBe(HostelAllocationStatus.CHECKED_IN);
    expect(checkinRes.body.data.actualCheckInDate).toBeTruthy();
  });

  it('5. Performs bed transfer: closes old allocation as TRANSFERRED and creates new one with preserved history', async () => {
    // Transfer from Bed 1 to Bed 2
    const transferRes = await request(app)
      .post(`/api/v1/hostel/allocations/${allocationId}/transfer`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        newHostelId: hostelId,
        newRoomId: roomId,
        newBedId: bed2Id,
        transferReason: HostelTransferReason.ROOM_CHANGE,
        transferRemarks: 'Student requested desk closer to window',
      });

    expect(transferRes.status).toBe(200);
    transferredAllocationId = transferRes.body.data._id;
    expect(transferredAllocationId).not.toBe(allocationId);
    expect(transferRes.body.data.previousAllocationId).toBe(allocationId);
    expect(transferRes.body.data.status).toBe(HostelAllocationStatus.CHECKED_IN);

    // Verify old allocation is preserved and closed as TRANSFERRED
    const oldAlloc = await HostelAllocation.findById(allocationId);
    expect(oldAlloc?.status).toBe(HostelAllocationStatus.TRANSFERRED);
    expect(oldAlloc?.transferReason).toBe(HostelTransferReason.ROOM_CHANGE);
    expect(oldAlloc?.transferRemarks).toBe('Student requested desk closer to window');

    // Verify bed states
    const b1 = await Bed.findById(bed1Id);
    expect(b1?.status).toBe(BedStatus.AVAILABLE);
    expect(b1?.isOccupied).toBe(false);

    const b2 = await Bed.findById(bed2Id);
    expect(b2?.status).toBe(BedStatus.OCCUPIED);
    expect(b2?.isOccupied).toBe(true);
    expect(b2?.currentStudentId?.toString()).toBe(studentId);

    // Room still has 1 occupied bed (transferred internally)
    const room = await Room.findById(roomId);
    expect(room?.occupiedBedsCount).toBe(1);
    expect(room?.status).toBe(RoomStatus.PARTIALLY_OCCUPIED);
  });

  it('6. Checks out student from transferred bed and restores room to AVAILABLE', async () => {
    const checkoutRes = await request(app)
      .post(`/api/v1/hostel/allocations/${transferredAllocationId}/check-out`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        checkoutReason: 'End of academic term',
        clearanceStatus: 'CLEARED',
      });

    expect(checkoutRes.status).toBe(200);
    expect(checkoutRes.body.data.status).toBe(HostelAllocationStatus.CHECKED_OUT);

    const b2 = await Bed.findById(bed2Id);
    expect(b2?.status).toBe(BedStatus.AVAILABLE);
    expect(b2?.isOccupied).toBe(false);

    const room = await Room.findById(roomId);
    expect(room?.occupiedBedsCount).toBe(0);
    expect(room?.status).toBe(RoomStatus.AVAILABLE);
  });

  // =========================================================================
  // 3. Residential Attendance
  // =========================================================================

  it('7. Records attendance and queries stats', async () => {
    const attRes = await request(app)
      .post('/api/v1/hostel/attendance')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        hostelId,
        studentId,
        date: new Date(),
        status: HostelAttendanceStatus.PRESENT,
        remarks: 'Night roll call verified',
      });

    expect(attRes.status).toBe(200);
    expect(attRes.body.data.status).toBe(HostelAttendanceStatus.PRESENT);

    const statsRes = await request(app)
      .get(`/api/v1/hostel/attendance/stats?hostelId=${hostelId}`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.PRESENT).toBe(1);
  });

  // =========================================================================
  // 4. Outings & Leave
  // =========================================================================

  it('8. Manages outing lifecycle: request -> approve -> depart -> return', async () => {
    // Re-allocate bed for outing test
    await request(app)
      .post('/api/v1/hostel/allocations')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId,
        academicYearId: academicYearId.toString(),
        hostelId,
        roomId,
        bedId: bed1Id,
      });

    // 8a. Request Outing
    const now = new Date();
    const returnTime = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours later

    const reqRes = await request(app)
      .post('/api/v1/hostel/outings')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        hostelId,
        studentId,
        startDateTime: now,
        expectedReturnDateTime: returnTime,
        reason: 'Weekend library book shopping',
        destination: 'City Center Bookstore',
      });

    expect(reqRes.status).toBe(201);
    outingId = reqRes.body.data._id;
    expect(reqRes.body.data.status).toBe(HostelOutingStatus.REQUESTED);

    // 8b. Approve Outing
    const approveRes = await request(app)
      .post(`/api/v1/hostel/outings/${outingId}/approve`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        approved: true,
        remarks: 'Approved by Chief Warden',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe(HostelOutingStatus.APPROVED);

    // 8c. Record Departure
    const departRes = await request(app)
      .post(`/api/v1/hostel/outings/${outingId}/depart`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(departRes.status).toBe(200);
    expect(departRes.body.data.status).toBe(HostelOutingStatus.OUT);

    // 8d. Record Return
    const returnRes = await request(app)
      .post(`/api/v1/hostel/outings/${outingId}/return`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(returnRes.status).toBe(200);
    expect(returnRes.body.data.status).toBe(HostelOutingStatus.RETURNED);
  });

  // =========================================================================
  // 5. Incidents, Inspections & Maintenance
  // =========================================================================

  it('9. Reports and resolves a hostel incident', async () => {
    const incRes = await request(app)
      .post('/api/v1/hostel/incidents')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        hostelId,
        roomId,
        studentId,
        type: HostelIncidentType.DISCIPLINARY,
        severity: HostelIncidentSeverity.HIGH,
        description: 'Curfew violation - returned past 21:00 without permission',
        immediateActionTaken: 'Verbal warning recorded by security',
      });

    expect(incRes.status).toBe(201);
    incidentId = incRes.body.data._id;
    expect(incRes.body.data.status).toBe(HostelIncidentStatus.OPEN);

    // Resolve incident
    const resolveRes = await request(app)
      .put(`/api/v1/hostel/incidents/${incidentId}`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: HostelIncidentStatus.RESOLVED,
        resolution: 'Parent contacted and curfew agreement signed',
      });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.status).toBe(HostelIncidentStatus.RESOLVED);
  });

  it('10. Conducts room inspection and creates maintenance request with minor units cost', async () => {
    // 10a. Room Inspection
    const inspRes = await request(app)
      .post('/api/v1/hostel/inspections')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        hostelId,
        roomId,
        cleanliness: 5,
        safety: 4,
        electrical: 5,
        furniture: 4,
        plumbing: 3,
        issuesFound: ['Leaky sink faucet in attached washroom'],
      });

    expect(inspRes.status).toBe(201);
    expect(inspRes.body.data.cleanliness).toBe(5);

    // 10b. Maintenance Request
    const maintRes = await request(app)
      .post('/api/v1/hostel/maintenance')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        hostelId,
        roomId,
        category: HostelMaintenanceCategory.PLUMBING,
        priority: HostelMaintenancePriority.MEDIUM,
        description: 'Replace washroom faucet washer',
        assignedTo: wardenEmployeeId,
      });

    expect(maintRes.status).toBe(201);
    maintenanceId = maintRes.body.data._id;

    // Resolve maintenance with costMinorUnits (e.g. $45.50 = 4550 cents)
    const updateMaintRes = await request(app)
      .put(`/api/v1/hostel/maintenance/${maintenanceId}`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: HostelMaintenanceStatus.RESOLVED,
        resolution: 'New washer installed, tested watertight',
        costMinorUnits: 4550,
      });

    expect(updateMaintRes.status).toBe(200);
    expect(updateMaintRes.body.data.status).toBe(HostelMaintenanceStatus.RESOLVED);
    expect(updateMaintRes.body.data.costMinorUnits).toBe(4550);
  });

  // =========================================================================
  // 6. Fees & Invoicing Integration
  // =========================================================================

  it('11. Assigns hostel fees and generates Phase 13 FeeInvoice', async () => {
    const feeRes = await request(app)
      .post('/api/v1/hostel/fees')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId,
        academicYearId: academicYearId.toString(),
        hostelId,
        billingFrequency: HostelBillingFrequency.QUARTERLY,
        baseAmountMinorUnits: 30000, // $300.00
        messFeeMinorUnits: 10000,    // $100.00
        cautionDepositMinorUnits: 5000, // $50.00
      });

    expect(feeRes.status).toBe(201);
    feeAssignmentId = feeRes.body.data._id;
    expect(feeRes.body.data.totalAmountMinorUnits).toBe(45000);
    expect(feeRes.body.data.billingStatus).toBe('PENDING');

    // Generate Invoice
    const invoiceRes = await request(app)
      .post(`/api/v1/hostel/fees/${feeAssignmentId}/generate-invoice`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(invoiceRes.status).toBe(200);
    expect(invoiceRes.body.data.billingStatus).toBe('INVOICED');
    expect(invoiceRes.body.data.invoiceId).toBeTruthy();
  });

  // =========================================================================
  // 7. Dashboard KPIs Aggregation
  // =========================================================================

  it('12. Retrieves dashboard statistics with accurate occupancy and operational metrics', async () => {
    const statsRes = await request(app)
      .get('/api/v1/hostel/dashboard')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(statsRes.status).toBe(200);
    const data = statsRes.body.data;
    expect(data.totalCapacity).toBe(3);
    expect(data.totalHostels).toBe(1);
    expect(data.totalRooms).toBe(1);
    expect(data.hostels.length).toBe(1);
    expect(data.hostels[0].name).toBe('Olympus Boys Hostel');
  });
});
