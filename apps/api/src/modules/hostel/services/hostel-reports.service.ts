import { Types } from 'mongoose';
import {
  Hostel,
  HostelBuilding,
  Room,
  Bed,
  HostelAllocation,
  HostelAttendance,
  HostelOuting,
  HostelIncident,
  HostelMaintenance,
} from '@edusphere/database';
import {
  BedStatus,
  HostelOutingStatus,
  HostelIncidentStatus,
  HostelMaintenanceStatus,
} from '@edusphere/common';

export class HostelReportsService {
  public static async getDashboardStats(
    tenantId: Types.ObjectId,
    schoolId?: string | Types.ObjectId
  ): Promise<any> {
    const query: any = { tenantId, isDeleted: false };
    if (schoolId) {
      const sId = new Types.ObjectId(schoolId.toString());
      query.$or = [{ schoolId: sId }, { schoolId: { $exists: false } }, { schoolId: null }];
    }

    // 1. Bed counts (Source of truth)
    const [
      totalCapacity,
      occupiedBeds,
      totalHostels,
      totalBuildings,
      totalRooms,
      activeOutings,
      overdueOutings,
      openMaintenance,
      openIncidents,
    ] = await Promise.all([
      Bed.countDocuments({ ...query, active: true }),
      Bed.countDocuments({ ...query, status: BedStatus.OCCUPIED, active: true }),
      Hostel.countDocuments({ ...query }),
      HostelBuilding.countDocuments({ ...query }),
      Room.countDocuments({ ...query, active: true }),
      HostelOuting.countDocuments({
        tenantId,
        isDeleted: false,
        status: { $in: [HostelOutingStatus.OUT, HostelOutingStatus.OVERDUE] },
      }),
      HostelOuting.countDocuments({
        tenantId,
        isDeleted: false,
        status: HostelOutingStatus.OVERDUE,
      }),
      HostelMaintenance.countDocuments({
        tenantId,
        isDeleted: false,
        status: { $in: [HostelMaintenanceStatus.OPEN, HostelMaintenanceStatus.ASSIGNED, HostelMaintenanceStatus.IN_PROGRESS] },
      }),
      HostelIncident.countDocuments({
        tenantId,
        isDeleted: false,
        status: { $in: [HostelIncidentStatus.OPEN, HostelIncidentStatus.INVESTIGATING] },
      }),
    ]);

    const vacantBeds = Math.max(0, totalCapacity - occupiedBeds);
    const occupancyRate = totalCapacity > 0 ? Math.round((occupiedBeds / totalCapacity) * 100) : 0;

    // 2. Today's attendance summary
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const todayAttendance = await HostelAttendance.aggregate([
      {
        $match: {
          tenantId,
          date: { $gte: today, $lt: tomorrow },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const attendanceBreakdown: Record<string, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LEAVE: 0,
      OUT: 0,
      EXCUSED: 0,
    };
    for (const item of todayAttendance) {
      if (item._id) attendanceBreakdown[item._id] = item.count;
    }

    // 3. Per-hostel breakdown
    const hostels = await Hostel.find({ tenantId, isDeleted: false });
    const hostelBreakdowns = await Promise.all(
      hostels.map(async (h) => {
        const [bedsCount, occCount] = await Promise.all([
          Bed.countDocuments({ tenantId, hostelId: h._id, active: true, isDeleted: false }),
          Bed.countDocuments({ tenantId, hostelId: h._id, status: BedStatus.OCCUPIED, active: true, isDeleted: false }),
        ]);
        return {
          id: h._id,
          name: h.name,
          code: h.code,
          type: h.type,
          capacity: bedsCount,
          occupied: occCount,
          vacant: Math.max(0, bedsCount - occCount),
          occupancyRate: bedsCount > 0 ? Math.round((occCount / bedsCount) * 100) : 0,
        };
      })
    );

    return {
      totalCapacity,
      occupiedBeds,
      vacantBeds,
      occupancyRate,
      totalHostels,
      totalBuildings,
      totalRooms,
      activeOutings,
      overdueOutings,
      openMaintenance,
      openIncidents,
      attendanceBreakdown,
      hostels: hostelBreakdowns,
    };
  }
}
