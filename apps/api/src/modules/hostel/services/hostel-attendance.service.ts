import { Types } from 'mongoose';
import {
  HostelAttendance,
  HostelAllocation,
  IHostelAttendanceDoc,
} from '@edusphere/database';
import {
  NotFoundError,
  HostelAttendanceStatus,
} from '@edusphere/common';

export class HostelAttendanceService {
  public static async markAttendance(
    tenantId: Types.ObjectId,
    data: any,
    markedBy: Types.ObjectId
  ): Promise<IHostelAttendanceDoc> {
    const studentId = new Types.ObjectId(data.studentId.toString());
    const hostelId = new Types.ObjectId(data.hostelId.toString());
    const dateObj = new Date(data.date);
    dateObj.setUTCHours(0, 0, 0, 0);

    const record = await HostelAttendance.findOneAndUpdate(
      {
        tenantId,
        hostelId,
        studentId,
        date: dateObj,
        isDeleted: false,
      },
      {
        tenantId,
        schoolId: data.schoolId || new Types.ObjectId(),
        campusId: data.campusId,
        hostelId,
        studentId,
        date: dateObj,
        status: data.status || HostelAttendanceStatus.PRESENT,
        markedAt: new Date(),
        markedBy,
        remarks: data.remarks,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return record;
  }

  public static async batchMarkAttendance(
    tenantId: Types.ObjectId,
    hostelId: string | Types.ObjectId,
    date: string | Date,
    records: Array<{ studentId: string; status: HostelAttendanceStatus; remarks?: string }>,
    markedBy: Types.ObjectId,
    schoolId?: string | Types.ObjectId
  ): Promise<IHostelAttendanceDoc[]> {
    const hostelOid = new Types.ObjectId(hostelId.toString());
    const dateObj = new Date(date);
    dateObj.setUTCHours(0, 0, 0, 0);

    const savedRecords: IHostelAttendanceDoc[] = [];

    for (const item of records) {
      const studentOid = new Types.ObjectId(item.studentId);
      const rec = await HostelAttendance.findOneAndUpdate(
        {
          tenantId,
          hostelId: hostelOid,
          studentId: studentOid,
          date: dateObj,
          isDeleted: false,
        },
        {
          tenantId,
          schoolId: schoolId ? new Types.ObjectId(schoolId.toString()) : new Types.ObjectId(),
          hostelId: hostelOid,
          studentId: studentOid,
          date: dateObj,
          status: item.status,
          markedAt: new Date(),
          markedBy,
          remarks: item.remarks,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      savedRecords.push(rec);
    }

    return savedRecords;
  }

  public static async getAttendance(
    tenantId: Types.ObjectId,
    filter: any = {}
  ): Promise<{ data: IHostelAttendanceDoc[]; total: number }> {
    const query: any = { tenantId, isDeleted: false };
    if (filter.hostelId) query.hostelId = new Types.ObjectId(filter.hostelId.toString());
    if (filter.studentId) query.studentId = new Types.ObjectId(filter.studentId.toString());
    if (filter.status) query.status = filter.status;

    if (filter.date) {
      const d = new Date(filter.date);
      d.setUTCHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      query.date = { $gte: d, $lt: nextDay };
    } else if (filter.startDate && filter.endDate) {
      const start = new Date(filter.startDate);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(filter.endDate);
      end.setUTCHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    const limit = Math.min(filter.limit || 50, 100);
    const skip = filter.skip || 0;

    const [data, total] = await Promise.all([
      HostelAttendance.find(query)
        .populate('studentId', 'firstName lastName admissionNumber rollNumber')
        .populate('markedBy', 'name email')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      HostelAttendance.countDocuments(query),
    ]);

    return { data, total };
  }

  public static async getAttendanceStats(
    tenantId: Types.ObjectId,
    hostelId: string | Types.ObjectId,
    date: string | Date
  ): Promise<any> {
    const hostelOid = new Types.ObjectId(hostelId.toString());
    const dateObj = new Date(date);
    dateObj.setUTCHours(0, 0, 0, 0);
    const nextDay = new Date(dateObj);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const stats = await HostelAttendance.aggregate([
      {
        $match: {
          tenantId,
          hostelId: hostelOid,
          date: { $gte: dateObj, $lt: nextDay },
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

    const result: Record<string, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LEAVE: 0,
      OUT: 0,
      EXCUSED: 0,
    };
    for (const item of stats) {
      if (item._id) result[item._id] = item.count;
    }
    return result;
  }
}
