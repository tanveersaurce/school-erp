import { Types } from 'mongoose';
import {
  createTenant,
  createSchool,
  createCampus,
  createAcademicYear,
} from './entity.factories.js';
import { persona, PersonaResult } from './persona.factories.js';

export interface DualTenantEnvironment {
  tenantA: {
    tenant: any;
    school1: any;
    school2: any;
    campus1: any;
    campus2: any;
    academicYear: any;
    users: {
      superAdmin: PersonaResult;
      admin1: PersonaResult;
      admin2: PersonaResult;
      teacher1: PersonaResult;
      student1: PersonaResult;
      parent1: PersonaResult;
    };
  };
  tenantB: {
    tenant: any;
    school1: any;
    campus1: any;
    academicYear: any;
    users: {
      admin1: PersonaResult;
      teacher1: PersonaResult;
      student1: PersonaResult;
      parent1: PersonaResult;
    };
  };
}

export async function createDualTenantEnvironment(): Promise<DualTenantEnvironment> {
  // ==========================================
  // Tenant A: Greenwood Educational Trust
  // ==========================================
  const tenantA = await createTenant({ name: 'Tenant A Primary Trust', slug: `tenant-a-${Date.now()}` });
  const schoolA1 = await createSchool(tenantA._id, { name: 'Tenant A High School', code: 'TA-SCH1' });
  const schoolA2 = await createSchool(tenantA._id, { name: 'Tenant A Academy', code: 'TA-SCH2' });
  const campusA1 = await createCampus(tenantA._id, schoolA1._id, { name: 'Tenant A North Campus', code: 'TA-NC', isMainCampus: true });
  const campusA2 = await createCampus(tenantA._id, schoolA1._id, { name: 'Tenant A South Campus', code: 'TA-SC' });
  const academicYearA = await createAcademicYear(tenantA._id, schoolA1._id, campusA1._id, { isCurrent: true });

  const superAdminA = await persona.superAdmin(tenantA._id, { schoolId: schoolA1._id });
  const adminA1 = await persona.schoolAdmin(tenantA._id, { schoolId: schoolA1._id });
  const adminA2 = await persona.schoolAdmin(tenantA._id, { schoolId: schoolA2._id });
  const teacherA1 = await persona.teacher(tenantA._id, { schoolId: schoolA1._id });
  const studentA1 = await persona.student(tenantA._id, { schoolId: schoolA1._id });
  const parentA1 = await persona.parent(tenantA._id, { schoolId: schoolA1._id });

  // ==========================================
  // Tenant B: Isolated Academy Trust
  // ==========================================
  const tenantB = await createTenant({ name: 'Tenant B Isolated Trust', slug: `tenant-b-${Date.now()}` });
  const schoolB1 = await createSchool(tenantB._id, { name: 'Tenant B Central School', code: 'TB-SCH1' });
  const campusB1 = await createCampus(tenantB._id, schoolB1._id, { name: 'Tenant B Main Campus', code: 'TB-MC', isMainCampus: true });
  const academicYearB = await createAcademicYear(tenantB._id, schoolB1._id, campusB1._id, { isCurrent: true });

  const adminB1 = await persona.schoolAdmin(tenantB._id, { schoolId: schoolB1._id });
  const teacherB1 = await persona.teacher(tenantB._id, { schoolId: schoolB1._id });
  const studentB1 = await persona.student(tenantB._id, { schoolId: schoolB1._id });
  const parentB1 = await persona.parent(tenantB._id, { schoolId: schoolB1._id });

  return {
    tenantA: {
      tenant: tenantA,
      school1: schoolA1,
      school2: schoolA2,
      campus1: campusA1,
      campus2: campusA2,
      academicYear: academicYearA,
      users: {
        superAdmin: superAdminA,
        admin1: adminA1,
        admin2: adminA2,
        teacher1: teacherA1,
        student1: studentA1,
        parent1: parentA1,
      },
    },
    tenantB: {
      tenant: tenantB,
      school1: schoolB1,
      campus1: campusB1,
      academicYear: academicYearB,
      users: {
        admin1: adminB1,
        teacher1: teacherB1,
        student1: studentB1,
        parent1: parentB1,
      },
    },
  };
}
