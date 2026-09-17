import { Types } from 'mongoose';
import {
  Hostel,
  HostelBuilding,
  HostelFloor,
  HostelRoomType,
  Room,
  Bed,
  HostelAllocation,
  IHostelDoc,
  IHostelBuildingDoc,
  IHostelFloorDoc,
  IHostelRoomTypeDoc,
  IHostelRoomDoc,
  IHostelBedDoc,
} from '@edusphere/database';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  RoomStatus,
  BedStatus,
} from '@edusphere/common';

export class HostelStructureService {
  // =========================================================================
  // 1. Hostel Operations
  // =========================================================================

  public static async createHostel(
    tenantId: Types.ObjectId,
    data: any
  ): Promise<IHostelDoc> {
    const existing = await Hostel.findOne({
      tenantId,
      name: data.name,
      isDeleted: false,
    });
    if (existing) {
      throw new ConflictError(`Hostel with name "${data.name}" already exists.`);
    }

    if (data.code) {
      const codeExists = await Hostel.findOne({
        tenantId,
        code: data.code.toUpperCase(),
        isDeleted: false,
      });
      if (codeExists) {
        throw new ConflictError(`Hostel with code "${data.code}" already exists.`);
      }
    }

    const hostel = new Hostel({
      ...data,
      tenantId,
      code: data.code ? data.code.toUpperCase() : undefined,
    });
    await hostel.save();
    return hostel;
  }

  public static async getHostels(
    tenantId: Types.ObjectId,
    filter: any = {}
  ): Promise<{ data: IHostelDoc[]; total: number }> {
    const query: any = { tenantId, isDeleted: false };
    if (filter.schoolId) query.schoolId = filter.schoolId;
    if (filter.status) query.status = filter.status;
    if (filter.type) query.type = filter.type;
    if (filter.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: 'i' } },
        { code: { $regex: filter.search, $options: 'i' } },
      ];
    }

    const limit = Math.min(filter.limit || 50, 100);
    const skip = filter.skip || 0;

    const [data, total] = await Promise.all([
      Hostel.find(query).sort({ name: 1 }).skip(skip).limit(limit),
      Hostel.countDocuments(query),
    ]);
    return { data, total };
  }

  public static async getHostelById(
    tenantId: Types.ObjectId,
    id: string | Types.ObjectId
  ): Promise<IHostelDoc> {
    if (!id || !Types.ObjectId.isValid(id.toString())) {
      throw new NotFoundError('Hostel not found.');
    }
    const hostel = await Hostel.findOne({
      _id: new Types.ObjectId(id.toString()),
      tenantId,
      isDeleted: false,
    });
    if (!hostel) {
      throw new NotFoundError('Hostel not found.');
    }
    return hostel;
  }

  public static async updateHostel(
    tenantId: Types.ObjectId,
    id: string | Types.ObjectId,
    data: any
  ): Promise<IHostelDoc> {
    const hostel = await this.getHostelById(tenantId, id);

    if (data.name && data.name !== hostel.name) {
      const existing = await Hostel.findOne({
        tenantId,
        name: data.name,
        _id: { $ne: hostel._id },
        isDeleted: false,
      });
      if (existing) {
        throw new ConflictError(`Hostel with name "${data.name}" already exists.`);
      }
    }

    Object.assign(hostel, data);
    if (data.code) hostel.code = data.code.toUpperCase();
    await (hostel as any).save();
    return hostel;
  }

  public static async deleteHostel(
    tenantId: Types.ObjectId,
    id: string | Types.ObjectId
  ): Promise<void> {
    const hostel = await this.getHostelById(tenantId, id);

    // Check if active beds or allocations exist
    const activeAllocations = await HostelAllocation.countDocuments({
      tenantId,
      hostelId: hostel._id,
      status: { $in: ['ALLOCATED', 'CHECKED_IN'] },
      isDeleted: false,
    });
    if (activeAllocations > 0) {
      throw new ConflictError('Cannot delete hostel with active student allocations.');
    }

    hostel.isDeleted = true;
    await (hostel as any).save();
  }

  // =========================================================================
  // 2. Building Operations
  // =========================================================================

  public static async createBuilding(
    tenantId: Types.ObjectId,
    data: any
  ): Promise<IHostelBuildingDoc> {
    const hostel = await this.getHostelById(tenantId, data.hostelId);

    const existing = await HostelBuilding.findOne({
      tenantId,
      hostelId: hostel._id,
      code: data.code.toUpperCase(),
      isDeleted: false,
    });
    if (existing) {
      throw new ConflictError(`Building with code "${data.code}" already exists in this hostel.`);
    }

    const building = new HostelBuilding({
      ...data,
      tenantId,
      hostelId: hostel._id,
      code: data.code.toUpperCase(),
      schoolId: data.schoolId || hostel.schoolId,
    });
    await building.save();
    return building;
  }

  public static async getBuildings(
    tenantId: Types.ObjectId,
    hostelId?: string | Types.ObjectId
  ): Promise<IHostelBuildingDoc[]> {
    const query: any = { tenantId, isDeleted: false };
    if (hostelId) query.hostelId = new Types.ObjectId(hostelId.toString());
    return HostelBuilding.find(query).sort({ name: 1 });
  }

  public static async getBuildingById(
    tenantId: Types.ObjectId,
    id: string | Types.ObjectId
  ): Promise<IHostelBuildingDoc> {
    const building = await HostelBuilding.findOne({
      _id: new Types.ObjectId(id.toString()),
      tenantId,
      isDeleted: false,
    });
    if (!building) {
      throw new NotFoundError('Hostel building not found.');
    }
    return building;
  }

  public static async updateBuilding(
    tenantId: Types.ObjectId,
    id: string | Types.ObjectId,
    data: any
  ): Promise<IHostelBuildingDoc> {
    const building = await this.getBuildingById(tenantId, id);
    Object.assign(building, data);
    if (data.code) building.code = data.code.toUpperCase();
    await (building as any).save();
    return building;
  }

  public static async deleteBuilding(
    tenantId: Types.ObjectId,
    id: string | Types.ObjectId
  ): Promise<void> {
    const building = await this.getBuildingById(tenantId, id);

    const activeAllocations = await HostelAllocation.countDocuments({
      tenantId,
      buildingId: building._id,
      status: { $in: ['ALLOCATED', 'CHECKED_IN'] },
      isDeleted: false,
    });
    if (activeAllocations > 0) {
      throw new ConflictError('Cannot delete building with active student allocations.');
    }

    building.isDeleted = true;
    await (building as any).save();
  }

  // =========================================================================
  // 3. Floor Operations
  // =========================================================================

  public static async createFloor(
    tenantId: Types.ObjectId,
    data: any
  ): Promise<IHostelFloorDoc> {
    const building = await this.getBuildingById(tenantId, data.buildingId);

    const existing = await HostelFloor.findOne({
      tenantId,
      buildingId: building._id,
      floorNumber: data.floorNumber,
      isDeleted: false,
    });
    if (existing) {
      throw new ConflictError(`Floor number ${data.floorNumber} already exists in this building.`);
    }

    const floor = new HostelFloor({
      ...data,
      tenantId,
      buildingId: building._id,
      hostelId: building.hostelId,
      schoolId: data.schoolId || building.schoolId,
      code: data.code.toUpperCase(),
    });
    await floor.save();
    return floor;
  }

  public static async getFloors(
    tenantId: Types.ObjectId,
    buildingId?: string | Types.ObjectId
  ): Promise<IHostelFloorDoc[]> {
    const query: any = { tenantId, isDeleted: false };
    if (buildingId) query.buildingId = new Types.ObjectId(buildingId.toString());
    return HostelFloor.find(query).sort({ floorNumber: 1 });
  }

  // =========================================================================
  // 4. Room Type Operations
  // =========================================================================

  public static async createRoomType(
    tenantId: Types.ObjectId,
    data: any
  ): Promise<IHostelRoomTypeDoc> {
    const existing = await HostelRoomType.findOne({
      tenantId,
      code: data.code.toUpperCase(),
      isDeleted: false,
    });
    if (existing) {
      throw new ConflictError(`Room type with code "${data.code}" already exists.`);
    }

    const roomType = new HostelRoomType({
      ...data,
      tenantId,
      code: data.code.toUpperCase(),
    });
    await roomType.save();
    return roomType;
  }

  public static async getRoomTypes(
    tenantId: Types.ObjectId
  ): Promise<IHostelRoomTypeDoc[]> {
    return HostelRoomType.find({ tenantId, isDeleted: false }).sort({ name: 1 });
  }

  // =========================================================================
  // 5. Room Operations
  // =========================================================================

  public static async createRoom(
    tenantId: Types.ObjectId,
    data: any
  ): Promise<IHostelRoomDoc> {
    const hostel = await this.getHostelById(tenantId, data.hostelId);

    const existing = await Room.findOne({
      tenantId,
      hostelId: hostel._id,
      roomNumber: data.roomNumber.toUpperCase(),
      isDeleted: false,
    });
    if (existing) {
      throw new ConflictError(`Room "${data.roomNumber}" already exists in this hostel.`);
    }

    const room = new Room({
      ...data,
      tenantId,
      schoolId: data.schoolId || hostel.schoolId,
      campusId: data.campusId || hostel.campusId,
      hostelId: hostel._id,
      roomNumber: data.roomNumber.toUpperCase(),
      capacity: data.capacity || 1,
      occupiedBedsCount: 0,
      status: RoomStatus.AVAILABLE,
    });
    await room.save();

    // Increment total rooms on hostel
    await Hostel.updateOne({ _id: hostel._id }, { $inc: { totalRooms: 1 } });

    return room;
  }

  public static async getRooms(
    tenantId: Types.ObjectId,
    filter: any = {}
  ): Promise<{ data: IHostelRoomDoc[]; total: number }> {
    const query: any = { tenantId, isDeleted: false };
    if (filter.hostelId) query.hostelId = new Types.ObjectId(filter.hostelId.toString());
    if (filter.buildingId) query.buildingId = new Types.ObjectId(filter.buildingId.toString());
    if (filter.floorId) query.floorId = new Types.ObjectId(filter.floorId.toString());
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      query.roomNumber = { $regex: filter.search, $options: 'i' };
    }

    const limit = Math.min(filter.limit || 50, 100);
    const skip = filter.skip || 0;

    const [data, total] = await Promise.all([
      Room.find(query)
        .populate('roomTypeId', 'name type expectedCapacity baseRateMinorUnits')
        .populate('buildingId', 'name code')
        .sort({ roomNumber: 1 })
        .skip(skip)
        .limit(limit),
      Room.countDocuments(query),
    ]);
    return { data, total };
  }

  public static async getRoomById(
    tenantId: Types.ObjectId,
    id: string | Types.ObjectId
  ): Promise<IHostelRoomDoc> {
    if (!id || !Types.ObjectId.isValid(id.toString())) {
      throw new NotFoundError('Room not found.');
    }
    const room = await Room.findOne({
      _id: new Types.ObjectId(id.toString()),
      tenantId,
      isDeleted: false,
    })
      .populate('roomTypeId')
      .populate('buildingId')
      .populate('floorId');

    if (!room) {
      throw new NotFoundError('Room not found.');
    }
    return room;
  }

  public static async updateRoom(
    tenantId: Types.ObjectId,
    id: string | Types.ObjectId,
    data: any
  ): Promise<IHostelRoomDoc> {
    const room = await this.getRoomById(tenantId, id);

    if (data.roomNumber && data.roomNumber.toUpperCase() !== room.roomNumber) {
      const existing = await Room.findOne({
        tenantId,
        hostelId: room.hostelId,
        roomNumber: data.roomNumber.toUpperCase(),
        _id: { $ne: room._id },
        isDeleted: false,
      });
      if (existing) {
        throw new ConflictError(`Room "${data.roomNumber}" already exists in this hostel.`);
      }
      room.roomNumber = data.roomNumber.toUpperCase();
    }

    if (data.roomTypeId) room.roomTypeId = new Types.ObjectId(data.roomTypeId);
    if (data.description !== undefined) room.description = data.description;
    if (data.status) room.status = data.status;
    if (data.active !== undefined) room.active = data.active;

    await (room as any).save();
    return room;
  }

  // =========================================================================
  // 6. Bed Operations (Physical beds as source of truth)
  // =========================================================================

  public static async createBed(
    tenantId: Types.ObjectId,
    data: any
  ): Promise<IHostelBedDoc> {
    const room = await this.getRoomById(tenantId, data.roomId);

    const existing = await Bed.findOne({
      tenantId,
      roomId: room._id,
      bedNumber: data.bedNumber.toUpperCase(),
      isDeleted: false,
    });
    if (existing) {
      throw new ConflictError(`Bed "${data.bedNumber}" already exists in room ${room.roomNumber}.`);
    }

    const bed = new Bed({
      ...data,
      tenantId,
      schoolId: data.schoolId || room.schoolId,
      campusId: data.campusId || room.campusId,
      roomId: room._id,
      hostelId: room.hostelId,
      buildingId: room.buildingId,
      floorId: room.floorId,
      bedNumber: data.bedNumber.toUpperCase(),
      code: `${room.roomNumber}-${data.bedNumber.toUpperCase()}`,
      status: BedStatus.AVAILABLE,
      isOccupied: false,
    });
    await bed.save();

    // Resynchronize room capacity & hostel total capacity
    const roomOid = new Types.ObjectId(((room as any)._id || (room as any).id)!.toString());
    await this.syncRoomCapacity(tenantId, roomOid);

    return bed;
  }

  public static async batchCreateBeds(
    tenantId: Types.ObjectId,
    roomId: string | Types.ObjectId,
    bedNumbers: string[]
  ): Promise<IHostelBedDoc[]> {
    const room = await this.getRoomById(tenantId, roomId);

    const createdBeds: IHostelBedDoc[] = [];
    for (const num of bedNumbers) {
      const cleanNum = num.trim().toUpperCase();
      const existing = await Bed.findOne({
        tenantId,
        roomId: room._id,
        bedNumber: cleanNum,
        isDeleted: false,
      });

      if (!existing) {
        const bed = new Bed({
          tenantId,
          schoolId: room.schoolId,
          campusId: room.campusId,
          roomId: room._id,
          hostelId: room.hostelId,
          buildingId: room.buildingId,
          floorId: room.floorId,
          bedNumber: cleanNum,
          code: `${room.roomNumber}-${cleanNum}`,
          status: BedStatus.AVAILABLE,
          isOccupied: false,
        });
        await bed.save();
        createdBeds.push(bed);
      }
    }

    const roomOid = new Types.ObjectId(((room as any)._id || (room as any).id)!.toString());
    await this.syncRoomCapacity(tenantId, roomOid);
    return createdBeds;
  }

  public static async getBeds(
    tenantId: Types.ObjectId,
    filter: any = {}
  ): Promise<{ data: IHostelBedDoc[]; total: number }> {
    const query: any = { tenantId, isDeleted: false };
    if (filter.roomId) query.roomId = new Types.ObjectId(filter.roomId.toString());
    if (filter.hostelId) query.hostelId = new Types.ObjectId(filter.hostelId.toString());
    if (filter.status) query.status = filter.status;
    if (filter.isOccupied !== undefined) query.isOccupied = filter.isOccupied === 'true' || filter.isOccupied === true;

    const limit = Math.min(filter.limit || 50, 100);
    const skip = filter.skip || 0;

    const [data, total] = await Promise.all([
      Bed.find(query)
        .populate('currentStudentId', 'firstName lastName admissionNumber rollNumber')
        .populate('roomId', 'roomNumber floor status')
        .sort({ bedNumber: 1 })
        .skip(skip)
        .limit(limit),
      Bed.countDocuments(query),
    ]);
    return { data, total };
  }

  public static async getBedById(
    tenantId: Types.ObjectId,
    id: string | Types.ObjectId
  ): Promise<IHostelBedDoc> {
    if (!id || !Types.ObjectId.isValid(id.toString())) {
      throw new NotFoundError('Bed not found.');
    }
    const bed = await Bed.findOne({
      _id: new Types.ObjectId(id.toString()),
      tenantId,
      isDeleted: false,
    })
      .populate('currentStudentId', 'firstName lastName admissionNumber rollNumber')
      .populate('roomId');

    if (!bed) {
      throw new NotFoundError('Bed not found.');
    }
    return bed;
  }

  public static async deleteBed(
    tenantId: Types.ObjectId,
    id: string | Types.ObjectId
  ): Promise<void> {
    const bed = await this.getBedById(tenantId, id);

    if (bed.status === BedStatus.OCCUPIED || bed.isOccupied) {
      throw new ConflictError('Cannot delete occupied bed.');
    }

    const activeAllocations = await HostelAllocation.countDocuments({
      tenantId,
      bedId: bed._id,
      status: { $in: ['ALLOCATED', 'CHECKED_IN'] },
      isDeleted: false,
    });
    if (activeAllocations > 0) {
      throw new ConflictError('Cannot delete bed with active allocation.');
    }

    bed.isDeleted = true;
    await (bed as any).save();

    await this.syncRoomCapacity(tenantId, new Types.ObjectId(bed.roomId!.toString()));
  }

  /**
   * Recalculates room capacity and occupied beds count from physical Bed documents,
   * updates Room.status, and updates Hostel total capacity.
   */
  public static async syncRoomCapacity(
    tenantId: Types.ObjectId,
    roomId: Types.ObjectId
  ): Promise<void> {
    const [totalBeds, occupiedBeds] = await Promise.all([
      Bed.countDocuments({ tenantId, roomId, isDeleted: false, active: true }),
      Bed.countDocuments({
        tenantId,
        roomId,
        isDeleted: false,
        status: BedStatus.OCCUPIED,
      }),
    ]);

    let status = RoomStatus.AVAILABLE;
    if (totalBeds > 0) {
      if (occupiedBeds >= totalBeds) {
        status = RoomStatus.FULL;
      } else if (occupiedBeds > 0) {
        status = RoomStatus.PARTIALLY_OCCUPIED;
      }
    }

    const room = await Room.findOneAndUpdate(
      { _id: roomId, tenantId },
      {
        capacity: Math.max(totalBeds, 1),
        occupiedBedsCount: occupiedBeds,
        status,
      },
      { new: true }
    );

    if (room && room.hostelId) {
      // Synchronize overall hostel capacity
      const allHostelActiveBeds = await Bed.countDocuments({
        tenantId,
        hostelId: room.hostelId,
        isDeleted: false,
        active: true,
      });

      await Hostel.updateOne(
        { _id: room.hostelId, tenantId },
        { capacity: allHostelActiveBeds }
      );
    }
  }
}
