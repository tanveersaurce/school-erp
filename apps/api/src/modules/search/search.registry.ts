import { Types, FilterQuery } from 'mongoose';
import {
  Student,
  Parent,
  StudentParentRelation,
  Staff,
  Book,
  InventoryItem,
  InventoryAsset,
  Vehicle,
  Hostel,
  FeeInvoice,
  Announcement,
  Exam,
  Class,
  User,
} from '@edusphere/database';
import { GlobalSearchEntity, GlobalSearchResultItem } from '@edusphere/types';
import { UserType } from '@edusphere/common';

export interface SearchProviderContext {
  tenantId: string;
  userId: string;
  userType: UserType;
  permissions: string[];
  schoolId?: string;
  campusId?: string;
  query: string;
  limit: number;
}

export interface SearchProvider {
  entityType: GlobalSearchEntity;
  category: string;
  label: string;
  requiredPermission: string;
  search: (ctx: SearchProviderContext) => Promise<GlobalSearchResultItem[]>;
}

export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const SEARCH_PROVIDERS: SearchProvider[] = [
  // 1. Students
  {
    entityType: 'STUDENT',
    category: 'People',
    label: 'Students',
    requiredPermission: 'student:read',
    async search(ctx: SearchProviderContext): Promise<GlobalSearchResultItem[]> {
      const regex = new RegExp(escapeRegex(ctx.query), 'i');
      const queryFilter: FilterQuery<any> = {
        tenantId: new Types.ObjectId(ctx.tenantId),
        isDeleted: false,
      };

      if (ctx.schoolId) queryFilter.schoolId = new Types.ObjectId(ctx.schoolId);
      if (ctx.campusId) queryFilter.campusId = new Types.ObjectId(ctx.campusId);

      // Parent Scoping: restrict to their linked students
      if (ctx.userType === UserType.PARENT) {
        const parentRecord = await Parent.findOne({
          userId: new Types.ObjectId(ctx.userId),
          tenantId: new Types.ObjectId(ctx.tenantId),
        }).lean();

        if (!parentRecord) return [];

        const relations = await StudentParentRelation.find({
          parentId: parentRecord._id,
          tenantId: new Types.ObjectId(ctx.tenantId),
        }).lean();

        const linkedStudentIds = relations.map((r) => r.studentId);
        if (linkedStudentIds.length === 0) return [];
        queryFilter._id = { $in: linkedStudentIds };
      }

      // Find matching users first
      const matchingUsers = await User.find({
        tenantId: new Types.ObjectId(ctx.tenantId),
        $or: [{ firstName: regex }, { lastName: regex }, { email: regex }],
      })
        .select('_id')
        .lean();

      const userIds = matchingUsers.map((u) => u._id);

      queryFilter.$or = [
        { admissionNumber: regex },
        { rollNumber: regex },
        { studentId: regex },
        { 'personalDetails.firstName': regex },
        { 'personalDetails.lastName': regex },
        ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : []),
      ];

      const students = await Student.find(queryFilter)
        .limit(ctx.limit)
        .populate('userId', 'firstName lastName email')
        .lean();

      return students.map((s: any) => {
        const user = s.userId;
        const name = user
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
          : s.personalDetails
            ? `${s.personalDetails.firstName || ''} ${s.personalDetails.lastName || ''}`.trim()
            : s.studentId || 'Student';
        return {
          entityType: 'STUDENT',
          entityId: s._id.toString(),
          title: name,
          subtitle: `Adm: ${s.admissionNumber || s.studentId || 'N/A'}${s.rollNumber ? ` | Roll: ${s.rollNumber}` : ''}`,
          matchedField: s.admissionNumber?.match(regex)
            ? 'admissionNumber'
            : s.rollNumber?.match(regex)
              ? 'rollNumber'
              : 'name',
          route: `/students/${s._id.toString()}`,
          status: s.status,
          metadata: {
            admissionNumber: s.admissionNumber,
            rollNumber: s.rollNumber,
          },
        };
      });
    },
  },

  // 2. Parents
  {
    entityType: 'PARENT',
    category: 'People',
    label: 'Parents',
    requiredPermission: 'parent:read',
    async search(ctx: SearchProviderContext): Promise<GlobalSearchResultItem[]> {
      const regex = new RegExp(escapeRegex(ctx.query), 'i');

      const matchingUsers = await User.find({
        tenantId: new Types.ObjectId(ctx.tenantId),
        userType: UserType.PARENT,
        $or: [{ firstName: regex }, { lastName: regex }, { email: regex }, { phoneNumber: regex }],
      })
        .limit(ctx.limit)
        .lean();

      if (matchingUsers.length === 0) return [];

      const parents = await Parent.find({
        tenantId: new Types.ObjectId(ctx.tenantId),
        userId: { $in: matchingUsers.map((u) => u._id) },
      }).lean();

      const parentMap = new Map(parents.map((p) => [p.userId?.toString(), p]));

      return matchingUsers.map((u: any) => {
        const p = parentMap.get(u._id.toString());
        return {
          entityType: 'PARENT',
          entityId: (p?._id || u._id).toString(),
          title: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
          subtitle: `Email: ${u.email || 'N/A'}${u.phoneNumber ? ` | Tel: ${u.phoneNumber}` : ''}`,
          matchedField: u.email?.match(regex) ? 'email' : 'name',
          route: `/people/parents/${(p?._id || u._id).toString()}`,
          status: u.status,
          metadata: {
            guardianId: p?.guardianId,
          },
        };
      });
    },
  },

  // 3. Staff & Faculty
  {
    entityType: 'STAFF',
    category: 'People',
    label: 'Staff & Faculty',
    requiredPermission: 'staff:read',
    async search(ctx: SearchProviderContext): Promise<GlobalSearchResultItem[]> {
      const regex = new RegExp(escapeRegex(ctx.query), 'i');
      const queryFilter: FilterQuery<any> = {
        tenantId: new Types.ObjectId(ctx.tenantId),
        isDeleted: false,
      };

      if (ctx.schoolId) queryFilter.schoolId = new Types.ObjectId(ctx.schoolId);

      const matchingUsers = await User.find({
        tenantId: new Types.ObjectId(ctx.tenantId),
        $or: [{ firstName: regex }, { lastName: regex }, { email: regex }],
      })
        .select('_id')
        .lean();

      queryFilter.$or = [
        { employeeId: regex },
        { department: regex },
        { designation: regex },
        ...(matchingUsers.length > 0 ? [{ userId: { $in: matchingUsers.map((u) => u._id) } }] : []),
      ];

      const staffMembers = await Staff.find(queryFilter)
        .limit(ctx.limit)
        .populate('userId', 'firstName lastName email')
        .lean();

      return staffMembers.map((stf: any) => {
        const u = stf.userId;
        const name = u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : stf.employeeId;
        return {
          entityType: 'STAFF',
          entityId: stf._id.toString(),
          title: name,
          subtitle: `${stf.designation || 'Staff'} (${stf.department || 'General'}) | ID: ${stf.employeeId}`,
          matchedField: stf.employeeId?.match(regex) ? 'employeeId' : 'name',
          route: `/hr/staff/${stf._id.toString()}`,
          status: stf.employmentStatus,
          metadata: {
            employeeId: stf.employeeId,
            department: stf.department,
          },
        };
      });
    },
  },

  // 4. Library Books
  {
    entityType: 'BOOK',
    category: 'Library',
    label: 'Library Books',
    requiredPermission: 'library:read',
    async search(ctx: SearchProviderContext): Promise<GlobalSearchResultItem[]> {
      const regex = new RegExp(escapeRegex(ctx.query), 'i');
      const queryFilter: FilterQuery<any> = {
        tenantId: new Types.ObjectId(ctx.tenantId),
        isDeleted: false,
        $or: [{ title: regex }, { author: regex }, { isbn: regex }, { barcode: regex }, { accessionNumber: regex }],
      };

      if (ctx.schoolId) queryFilter.schoolId = new Types.ObjectId(ctx.schoolId);

      const books = await Book.find(queryFilter).limit(ctx.limit).lean();

      return books.map((b: any) => ({
        entityType: 'BOOK',
        entityId: b._id.toString(),
        title: b.title,
        subtitle: `by ${b.author || 'Unknown'} (ISBN: ${b.isbn || 'N/A'})`,
        matchedField: b.title?.match(regex) ? 'title' : b.isbn?.match(regex) ? 'isbn' : 'author',
        route: `/library/books/${b._id.toString()}`,
        status: b.status,
        metadata: {
          isbn: b.isbn,
          author: b.author,
        },
      }));
    },
  },

  // 5. Inventory Items
  {
    entityType: 'INVENTORY_ITEM',
    category: 'Inventory & Assets',
    label: 'Inventory Items',
    requiredPermission: 'inventory:read',
    async search(ctx: SearchProviderContext): Promise<GlobalSearchResultItem[]> {
      const regex = new RegExp(escapeRegex(ctx.query), 'i');
      const queryFilter: FilterQuery<any> = {
        tenantId: new Types.ObjectId(ctx.tenantId),
        isDeleted: false,
        $or: [{ name: regex }, { code: regex }, { category: regex }, { sku: regex }],
      };

      if (ctx.schoolId) queryFilter.schoolId = new Types.ObjectId(ctx.schoolId);

      const items = await InventoryItem.find(queryFilter).limit(ctx.limit).lean();

      return items.map((it: any) => ({
        entityType: 'INVENTORY_ITEM',
        entityId: it._id.toString(),
        title: it.name,
        subtitle: `SKU: ${it.sku || it.code || 'N/A'} | Stock: ${it.currentStock ?? 'N/A'}`,
        matchedField: it.name?.match(regex) ? 'name' : 'sku',
        route: `/inventory/items/${it._id.toString()}`,
        status: it.status,
        metadata: {
          code: it.code,
          sku: it.sku,
        },
      }));
    },
  },

  // 6. Fixed Assets
  {
    entityType: 'ASSET',
    category: 'Inventory & Assets',
    label: 'Fixed Assets',
    requiredPermission: 'inventory:read',
    async search(ctx: SearchProviderContext): Promise<GlobalSearchResultItem[]> {
      const regex = new RegExp(escapeRegex(ctx.query), 'i');
      const queryFilter: FilterQuery<any> = {
        tenantId: new Types.ObjectId(ctx.tenantId),
        isDeleted: false,
        $or: [{ assetTag: regex }, { name: regex }, { serialNumber: regex }, { category: regex }],
      };

      if (ctx.schoolId) queryFilter.schoolId = new Types.ObjectId(ctx.schoolId);

      const assets = await InventoryAsset.find(queryFilter).limit(ctx.limit).lean();

      return assets.map((a: any) => ({
        entityType: 'ASSET',
        entityId: a._id.toString(),
        title: a.name,
        subtitle: `Tag: ${a.assetTag || 'N/A'} | S/N: ${a.serialNumber || 'N/A'}`,
        matchedField: a.assetTag?.match(regex) ? 'assetTag' : 'name',
        route: `/inventory/assets/${a._id.toString()}`,
        status: a.status,
        metadata: {
          assetTag: a.assetTag,
          serialNumber: a.serialNumber,
        },
      }));
    },
  },

  // 7. Transport Vehicles
  {
    entityType: 'VEHICLE',
    category: 'Transport',
    label: 'Fleet Vehicles',
    requiredPermission: 'transport:read',
    async search(ctx: SearchProviderContext): Promise<GlobalSearchResultItem[]> {
      const regex = new RegExp(escapeRegex(ctx.query), 'i');
      const queryFilter: FilterQuery<any> = {
        tenantId: new Types.ObjectId(ctx.tenantId),
        isDeleted: false,
        $or: [{ registrationNumber: regex }, { vehicleNumber: regex }, { make: regex }, { model: regex }],
      };

      if (ctx.schoolId) queryFilter.schoolId = new Types.ObjectId(ctx.schoolId);

      const vehicles = await Vehicle.find(queryFilter).limit(ctx.limit).lean();

      return vehicles.map((v: any) => ({
        entityType: 'VEHICLE',
        entityId: v._id.toString(),
        title: v.registrationNumber || v.vehicleNumber || 'Vehicle',
        subtitle: `${v.make || ''} ${v.model || ''} | Capacity: ${v.seatingCapacity ?? 'N/A'}`.trim(),
        matchedField: v.registrationNumber?.match(regex) ? 'registrationNumber' : 'vehicleNumber',
        route: `/transport/vehicles/${v._id.toString()}`,
        status: v.status,
        metadata: {
          registrationNumber: v.registrationNumber,
        },
      }));
    },
  },

  // 8. Hostels & Dorms
  {
    entityType: 'HOSTEL',
    category: 'Hostel',
    label: 'Hostels & Dorms',
    requiredPermission: 'hostel:read',
    async search(ctx: SearchProviderContext): Promise<GlobalSearchResultItem[]> {
      const regex = new RegExp(escapeRegex(ctx.query), 'i');
      const queryFilter: FilterQuery<any> = {
        tenantId: new Types.ObjectId(ctx.tenantId),
        isDeleted: false,
        $or: [{ name: regex }, { code: regex }, { type: regex }],
      };

      if (ctx.schoolId) queryFilter.schoolId = new Types.ObjectId(ctx.schoolId);

      const hostels = await Hostel.find(queryFilter).limit(ctx.limit).lean();

      return hostels.map((h: any) => ({
        entityType: 'HOSTEL',
        entityId: h._id.toString(),
        title: h.name,
        subtitle: `Code: ${h.code} | Type: ${h.type || 'Hostel'}`,
        matchedField: h.name?.match(regex) ? 'name' : 'code',
        route: `/hostel/hostels/${h._id.toString()}`,
        status: h.status,
        metadata: {
          code: h.code,
        },
      }));
    },
  },

  // 9. Fee Invoices
  {
    entityType: 'FEE_INVOICE',
    category: 'Finance',
    label: 'Fee Invoices',
    requiredPermission: 'fee:read',
    async search(ctx: SearchProviderContext): Promise<GlobalSearchResultItem[]> {
      const regex = new RegExp(escapeRegex(ctx.query), 'i');
      const queryFilter: FilterQuery<any> = {
        tenantId: new Types.ObjectId(ctx.tenantId),
        isDeleted: false,
        invoiceNumber: regex,
      };

      if (ctx.schoolId) queryFilter.schoolId = new Types.ObjectId(ctx.schoolId);

      const invoices = await FeeInvoice.find(queryFilter).limit(ctx.limit).lean();

      return invoices.map((inv: any) => ({
        entityType: 'FEE_INVOICE',
        entityId: inv._id.toString(),
        title: inv.invoiceNumber,
        subtitle: `Total: ${inv.totalAmount ?? inv.netAmount ?? 0} | Status: ${inv.status}`,
        matchedField: 'invoiceNumber',
        route: `/finance/invoices/${inv._id.toString()}`,
        status: inv.status,
        metadata: {
          invoiceNumber: inv.invoiceNumber,
          totalAmount: inv.totalAmount ?? inv.netAmount,
        },
      }));
    },
  },

  // 10. Communication Announcements
  {
    entityType: 'ANNOUNCEMENT',
    category: 'Communication',
    label: 'Announcements',
    requiredPermission: 'communication:read',
    async search(ctx: SearchProviderContext): Promise<GlobalSearchResultItem[]> {
      const regex = new RegExp(escapeRegex(ctx.query), 'i');
      const queryFilter: FilterQuery<any> = {
        tenantId: new Types.ObjectId(ctx.tenantId),
        isDeleted: false,
        $or: [{ title: regex }, { content: regex }],
      };

      if (ctx.schoolId) queryFilter.schoolId = new Types.ObjectId(ctx.schoolId);

      const announcements = await Announcement.find(queryFilter).limit(ctx.limit).lean();

      return announcements.map((a: any) => ({
        entityType: 'ANNOUNCEMENT',
        entityId: a._id.toString(),
        title: a.title,
        subtitle: `Priority: ${a.priority || 'Normal'} | Target: ${a.targetAudience || 'All'}`,
        matchedField: a.title?.match(regex) ? 'title' : 'content',
        route: `/communication/announcements/${a._id.toString()}`,
        status: a.status,
        metadata: {
          priority: a.priority,
        },
      }));
    },
  },

  // 11. Examinations
  {
    entityType: 'EXAM',
    category: 'Examinations',
    label: 'Exams',
    requiredPermission: 'exam:read',
    async search(ctx: SearchProviderContext): Promise<GlobalSearchResultItem[]> {
      const regex = new RegExp(escapeRegex(ctx.query), 'i');
      const queryFilter: FilterQuery<any> = {
        tenantId: new Types.ObjectId(ctx.tenantId),
        isDeleted: false,
        $or: [{ name: regex }, { code: regex }],
      };

      if (ctx.schoolId) queryFilter.schoolId = new Types.ObjectId(ctx.schoolId);

      const exams = await Exam.find(queryFilter).limit(ctx.limit).lean();

      return exams.map((e: any) => ({
        entityType: 'EXAM',
        entityId: e._id.toString(),
        title: e.name,
        subtitle: `Code: ${e.code || 'N/A'} | Status: ${e.status || 'Active'}`,
        matchedField: e.name?.match(regex) ? 'name' : 'code',
        route: `/examinations/exams/${e._id.toString()}`,
        status: e.status,
        metadata: {
          code: e.code,
        },
      }));
    },
  },

  // 12. Classes & Grades
  {
    entityType: 'CLASS',
    category: 'Academics',
    label: 'Classes & Grades',
    requiredPermission: 'academic:read',
    async search(ctx: SearchProviderContext): Promise<GlobalSearchResultItem[]> {
      const regex = new RegExp(escapeRegex(ctx.query), 'i');
      const queryFilter: FilterQuery<any> = {
        tenantId: new Types.ObjectId(ctx.tenantId),
        isDeleted: false,
        $or: [{ name: regex }, { code: regex }],
      };

      if (ctx.schoolId) queryFilter.schoolId = new Types.ObjectId(ctx.schoolId);

      const classes = await Class.find(queryFilter).limit(ctx.limit).lean();

      return classes.map((c: any) => ({
        entityType: 'CLASS',
        entityId: c._id.toString(),
        title: c.name,
        subtitle: `Code: ${c.code}`,
        matchedField: c.name?.match(regex) ? 'name' : 'code',
        route: `/academics/classes/${c._id.toString()}`,
        status: c.status,
        metadata: {
          code: c.code,
        },
      }));
    },
  },
];
