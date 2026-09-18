import { Types } from 'mongoose';
import {
  InventoryStore,
  InventoryStock,
  InventoryStockBatch,
  InventoryStockLedger,
  InventoryReceipt,
  InventoryIssue,
  InventoryReturn,
  InventoryTransfer,
  InventoryAdjustment,
  IInventoryReceiptDoc,
  IInventoryIssueDoc,
  IInventoryReturnDoc,
  IInventoryTransferDoc,
  IInventoryAdjustmentDoc,
} from '@edusphere/database';
import {
  BadRequestError,
  NotFoundError,
  Money,
  StockMovementType,
  StockReceiptStatus,
  StockIssueStatus,
  StockIssueDestinationType,
  StockReturnStatus,
  StockTransferStatus,
  StockAdjustmentType,
  StockAdjustmentReason,
  StockAdjustmentStatus,
} from '@edusphere/common';

export class InventoryMovementService {
  private static generateVoucherNumber(prefix: string): string {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    const ts = Date.now().toString().slice(-4);
    return `${prefix}-${year}-${random}${ts}`;
  }

  // =========================================================================
  // 1. Stock Receipts
  // =========================================================================

  public static async createReceipt(
    tenantId: Types.ObjectId,
    userId: Types.ObjectId,
    data: {
      schoolId: string;
      storeId: string;
      supplierId: string;
      purchaseOrderNumber?: string;
      invoiceNumber?: string;
      receivedDate?: string;
      notes?: string;
      items: Array<{
        itemId: string;
        locationId?: string | null;
        orderedQuantity?: number;
        receivedQuantity: number;
        unitCostMinorUnits: number;
        batchNumber?: string;
        manufacturingDate?: string | null;
        expiryDate?: string | null;
        remarks?: string;
      }>;
    }
  ): Promise<IInventoryReceiptDoc> {
    const store = await InventoryStore.findOne({ _id: new Types.ObjectId(data.storeId), tenantId });
    if (!store) {
      throw new NotFoundError('Store not found.');
    }

    const receiptNumber = this.generateVoucherNumber('RCV');
    let totalCostMinorUnits = 0;

    const receiptItems: any[] = [];

    for (const item of data.items) {
      const itemTotalMinorUnits = Money.multiply(item.unitCostMinorUnits, item.receivedQuantity);
      totalCostMinorUnits = Money.add(totalCostMinorUnits, itemTotalMinorUnits);

      // 1. Find or create stock record for this store + item
      let stock = await InventoryStock.findOne({
        tenantId,
        storeId: new Types.ObjectId(data.storeId),
        itemId: new Types.ObjectId(item.itemId),
      });

      if (!stock) {
        stock = await InventoryStock.create({
          tenantId,
          schoolId: new Types.ObjectId(data.schoolId),
          storeId: new Types.ObjectId(data.storeId),
          itemId: new Types.ObjectId(item.itemId),
          locationId: item.locationId ? new Types.ObjectId(item.locationId) : undefined,
          quantityOnHand: 0,
          quantityReserved: 0,
          quantityAvailable: 0,
          reorderLevel: 5,
          averageCostMinorUnits: item.unitCostMinorUnits,
        });
      }

      // Update stock level
      const balanceBefore = stock.quantityOnHand;
      stock.quantityOnHand += item.receivedQuantity;
      stock.quantityAvailable = stock.quantityOnHand - stock.quantityReserved;

      // Update weighted average cost
      if (stock.quantityOnHand > 0) {
        const previousTotal = Money.multiply(balanceBefore, stock.averageCostMinorUnits || item.unitCostMinorUnits);
        const currentAddition = itemTotalMinorUnits;
        const newTotalCost = Money.add(previousTotal, currentAddition);
        stock.averageCostMinorUnits = Math.round(newTotalCost / stock.quantityOnHand);
      }
      await stock.save();

      // 2. Handle batch if provided
      let batchDocId: Types.ObjectId | undefined;
      if (item.batchNumber) {
        const batch = await InventoryStockBatch.findOneAndUpdate(
          {
            tenantId,
            storeId: new Types.ObjectId(data.storeId),
            itemId: new Types.ObjectId(item.itemId),
            batchNumber: item.batchNumber.toUpperCase(),
          },
          {
            $inc: { quantityOnHand: item.receivedQuantity },
            $setOnInsert: {
              schoolId: new Types.ObjectId(data.schoolId),
              manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : undefined,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
              unitCostMinorUnits: item.unitCostMinorUnits,
              supplierId: new Types.ObjectId(data.supplierId),
            },
          },
          { upsert: true, new: true }
        );
        batchDocId = new Types.ObjectId(batch._id.toString());
      }

      // 3. Append immutable Stock Ledger entry
      await InventoryStockLedger.create({
        tenantId,
        schoolId: new Types.ObjectId(data.schoolId),
        itemId: new Types.ObjectId(item.itemId),
        storeId: new Types.ObjectId(data.storeId),
        locationId: item.locationId ? new Types.ObjectId(item.locationId) : undefined,
        batchId: batchDocId,
        movementType: StockMovementType.RECEIPT,
        quantity: item.receivedQuantity,
        balanceAfter: stock.quantityOnHand,
        unitCostMinorUnits: item.unitCostMinorUnits,
        totalCostMinorUnits: itemTotalMinorUnits,
        referenceType: 'RECEIPT',
        referenceId: receiptNumber,
        actorUserId: userId,
        timestamp: new Date(),
        reason: data.notes || `Stock received from supplier voucher ${receiptNumber}`,
      });

      receiptItems.push({
        itemId: new Types.ObjectId(item.itemId),
        locationId: item.locationId ? new Types.ObjectId(item.locationId) : undefined,
        quantity: item.receivedQuantity,
        orderedQuantity: item.orderedQuantity ?? item.receivedQuantity,
        receivedQuantity: item.receivedQuantity,
        unitCostMinorUnits: item.unitCostMinorUnits,
        totalCostMinorUnits: itemTotalMinorUnits,
        batchNumber: item.batchNumber ? item.batchNumber.toUpperCase() : undefined,
        manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : undefined,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
        remarks: item.remarks,
      });
    }

    const receipt = await InventoryReceipt.create({
      tenantId,
      schoolId: new Types.ObjectId(data.schoolId),
      receiptNumber,
      storeId: new Types.ObjectId(data.storeId),
      supplierId: data.supplierId ? new Types.ObjectId(data.supplierId) : undefined,
      purchaseOrderNumber: data.purchaseOrderNumber,
      invoiceNumber: data.invoiceNumber,
      receiptDate: data.receivedDate ? new Date(data.receivedDate) : new Date(),
      status: StockReceiptStatus.RECEIVED,
      totalAmountMinorUnits: totalCostMinorUnits,
      receivedByUserId: userId,
      notes: data.notes,
      items: receiptItems,
    });

    return receipt;
  }

  public static async getReceipts(
    tenantId: Types.ObjectId,
    filter: {
      schoolId?: string;
      storeId?: string;
      supplierId?: string;
      status?: StockReceiptStatus;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const query: any = { tenantId };
    if (filter.schoolId) query.schoolId = new Types.ObjectId(filter.schoolId);
    if (filter.storeId) query.storeId = new Types.ObjectId(filter.storeId);
    if (filter.supplierId) query.supplierId = new Types.ObjectId(filter.supplierId);
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      query.$or = [
        { receiptNumber: { $regex: filter.search, $options: 'i' } },
        { purchaseOrderNumber: { $regex: filter.search, $options: 'i' } },
        { invoiceNumber: { $regex: filter.search, $options: 'i' } },
      ];
    }

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      InventoryReceipt.find(query)
        .populate('storeId', 'name code')
        .populate('supplierId', 'name code')
        .populate('receivedByUserId', 'firstName lastName')
        .populate('items.itemId', 'name itemCode unitId')
        .sort({ receivedDate: -1 })
        .skip(skip)
        .limit(limit),
      InventoryReceipt.countDocuments(query),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getReceiptById(
    tenantId: Types.ObjectId,
    receiptId: string
  ): Promise<IInventoryReceiptDoc> {
    const receipt = await InventoryReceipt.findOne({ _id: new Types.ObjectId(receiptId), tenantId })
      .populate('storeId', 'name code')
      .populate('supplierId', 'name code contactPerson email phone')
      .populate('receivedByUserId', 'firstName lastName')
      .populate('items.itemId', 'name itemCode unitId');
    if (!receipt) {
      throw new NotFoundError('Receipt record not found.');
    }
    return receipt;
  }

  // =========================================================================
  // 2. Stock Issues (Atomic Depletion & Negative Stock Protection)
  // =========================================================================

  public static async createIssue(
    tenantId: Types.ObjectId,
    userId: Types.ObjectId,
    data: {
      schoolId: string;
      storeId: string;
      destinationType: StockIssueDestinationType;
      destinationId: string;
      purpose?: string;
      issueDate?: string;
      items: Array<{
        itemId: string;
        quantity: number;
        batchId?: string | null;
        unitCostMinorUnits?: number;
        totalCostMinorUnits?: number;
      }>;
    }
  ): Promise<IInventoryIssueDoc> {
    const store = await InventoryStore.findOne({ _id: new Types.ObjectId(data.storeId), tenantId });
    if (!store) {
      throw new NotFoundError('Store not found.');
    }

    const issueNumber = this.generateVoucherNumber('ISS');
    let totalCostMinorUnits = 0;
    const issueItems: any[] = [];

    // Process each item with strict atomic negative-stock prevention check
    for (const item of data.items) {
      const stock = await InventoryStock.findOne({
        tenantId,
        storeId: new Types.ObjectId(data.storeId),
        itemId: new Types.ObjectId(item.itemId),
      });

      if (!stock) {
        throw new NotFoundError(`Stock item not found in store for item ID ${item.itemId}.`);
      }

      // Concurrency guard: atomic decrement only if quantityOnHand >= item.quantity
      const updatedStock = await InventoryStock.findOneAndUpdate(
        {
          _id: stock._id,
          tenantId,
          quantityOnHand: { $gte: item.quantity },
        },
        {
          $inc: {
            quantityOnHand: -item.quantity,
            quantityAvailable: -item.quantity,
          },
        },
        { new: true }
      );

      if (!updatedStock) {
        throw new BadRequestError(
          `Cannot issue ${item.quantity} units of item ${item.itemId}. Available on hand: ${stock.quantityOnHand}. Operation prevented to avoid negative stock.`
        );
      }

      const costMinor = item.unitCostMinorUnits || updatedStock.averageCostMinorUnits || 0;
      const itemTotalMinorUnits = Money.multiply(costMinor, item.quantity);
      totalCostMinorUnits = Money.add(totalCostMinorUnits, itemTotalMinorUnits);

      // Batch decrement if specified
      if (item.batchId) {
        await InventoryStockBatch.findOneAndUpdate(
          {
            _id: new Types.ObjectId(item.batchId),
            tenantId,
            quantityOnHand: { $gte: item.quantity },
          },
          {
            $inc: { quantityOnHand: -item.quantity },
          }
        );
      }

      // Append immutable Stock Ledger entry
      await InventoryStockLedger.create({
        tenantId,
        schoolId: new Types.ObjectId(data.schoolId),
        itemId: new Types.ObjectId(item.itemId),
        storeId: new Types.ObjectId(data.storeId),
        batchId: item.batchId ? new Types.ObjectId(item.batchId) : undefined,
        movementType: StockMovementType.ISSUE,
        quantity: -item.quantity,
        balanceAfter: updatedStock.quantityOnHand,
        unitCostMinorUnits: costMinor,
        totalCostMinorUnits: itemTotalMinorUnits,
        referenceType: 'ISSUE',
        referenceId: issueNumber,
        actorUserId: userId,
        timestamp: new Date(),
        reason: data.purpose || `Stock issued voucher ${issueNumber}`,
      });

      issueItems.push({
        itemId: new Types.ObjectId(item.itemId),
        quantity: item.quantity,
        batchId: item.batchId ? new Types.ObjectId(item.batchId) : undefined,
        unitCostMinorUnits: costMinor,
        totalCostMinorUnits: itemTotalMinorUnits,
      });
    }

    const issue = await InventoryIssue.create({
      tenantId,
      schoolId: new Types.ObjectId(data.schoolId),
      issueNumber,
      storeId: new Types.ObjectId(data.storeId),
      destinationType: data.destinationType,
      destinationId: data.destinationId,
      purpose: data.purpose,
      issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
      status: StockIssueStatus.ISSUED,
      issuedByUserId: userId,
      items: issueItems,
    });

    return issue;
  }

  public static async getIssues(
    tenantId: Types.ObjectId,
    filter: {
      schoolId?: string;
      storeId?: string;
      destinationType?: StockIssueDestinationType;
      status?: StockIssueStatus;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const query: any = { tenantId };
    if (filter.schoolId) query.schoolId = new Types.ObjectId(filter.schoolId);
    if (filter.storeId) query.storeId = new Types.ObjectId(filter.storeId);
    if (filter.destinationType) query.destinationType = filter.destinationType;
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      query.$or = [
        { issueNumber: { $regex: filter.search, $options: 'i' } },
        { purpose: { $regex: filter.search, $options: 'i' } },
      ];
    }

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      InventoryIssue.find(query)
        .populate('storeId', 'name code')
        .populate('issuedByUserId', 'firstName lastName')
        .populate('items.itemId', 'name itemCode unitId')
        .sort({ issueDate: -1 })
        .skip(skip)
        .limit(limit),
      InventoryIssue.countDocuments(query),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getIssueById(
    tenantId: Types.ObjectId,
    issueId: string
  ): Promise<IInventoryIssueDoc> {
    const issue = await InventoryIssue.findOne({ _id: new Types.ObjectId(issueId), tenantId })
      .populate('storeId', 'name code')
      .populate('issuedByUserId', 'firstName lastName')
      .populate('items.itemId', 'name itemCode unitId');
    if (!issue) {
      throw new NotFoundError('Issue record not found.');
    }
    return issue;
  }

  // =========================================================================
  // 3. Stock Returns
  // =========================================================================

  public static async createReturn(
    tenantId: Types.ObjectId,
    userId: Types.ObjectId,
    data: {
      schoolId: string;
      storeId: string;
      originalIssueId?: string | null;
      returnedByUserId?: string | null;
      returnDate?: string;
      reason: string;
      items: Array<{
        itemId: string;
        quantity: number;
        condition?: string;
        reason?: string;
      }>;
    }
  ): Promise<IInventoryReturnDoc> {
    const returnNumber = this.generateVoucherNumber('RET');
    const returnItems: any[] = [];

    for (const item of data.items) {
      const stock = await InventoryStock.findOne({
        tenantId,
        storeId: new Types.ObjectId(data.storeId),
        itemId: new Types.ObjectId(item.itemId),
      });

      if (!stock) {
        throw new NotFoundError(`Stock item not found in store for item ID ${item.itemId}.`);
      }

      // Re-increment stock level
      stock.quantityOnHand += item.quantity;
      stock.quantityAvailable = stock.quantityOnHand - stock.quantityReserved;
      await stock.save();

      // Append immutable Stock Ledger entry
      await InventoryStockLedger.create({
        tenantId,
        schoolId: new Types.ObjectId(data.schoolId),
        itemId: new Types.ObjectId(item.itemId),
        storeId: new Types.ObjectId(data.storeId),
        movementType: StockMovementType.RETURN,
        quantity: item.quantity,
        balanceAfter: stock.quantityOnHand,
        unitCostMinorUnits: stock.averageCostMinorUnits || 0,
        totalCostMinorUnits: Money.multiply(stock.averageCostMinorUnits || 0, item.quantity),
        referenceType: 'RETURN',
        referenceId: returnNumber,
        actorUserId: userId,
        timestamp: new Date(),
        reason: data.reason || `Stock returned voucher ${returnNumber}`,
      });

      returnItems.push({
        itemId: new Types.ObjectId(item.itemId),
        quantity: item.quantity,
        condition: item.condition || 'GOOD',
        reason: item.reason,
      });
    }

    const returnDoc = await InventoryReturn.create({
      tenantId,
      schoolId: new Types.ObjectId(data.schoolId),
      returnNumber,
      storeId: new Types.ObjectId(data.storeId),
      originalIssueId: data.originalIssueId ? new Types.ObjectId(data.originalIssueId) : undefined,
      returnedByUserId: data.returnedByUserId ? new Types.ObjectId(data.returnedByUserId) : undefined,
      receivedByUserId: userId,
      returnDate: data.returnDate ? new Date(data.returnDate) : new Date(),
      status: StockReturnStatus.RETURNED,
      reason: data.reason,
      items: returnItems,
    });

    return returnDoc;
  }

  public static async getReturns(
    tenantId: Types.ObjectId,
    filter: {
      schoolId?: string;
      storeId?: string;
      status?: StockReturnStatus;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const query: any = { tenantId };
    if (filter.schoolId) query.schoolId = new Types.ObjectId(filter.schoolId);
    if (filter.storeId) query.storeId = new Types.ObjectId(filter.storeId);
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      query.$or = [
        { returnNumber: { $regex: filter.search, $options: 'i' } },
        { reason: { $regex: filter.search, $options: 'i' } },
      ];
    }

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      InventoryReturn.find(query)
        .populate('storeId', 'name code')
        .populate('receivedByUserId', 'firstName lastName')
        .populate('items.itemId', 'name itemCode unitId')
        .sort({ returnDate: -1 })
        .skip(skip)
        .limit(limit),
      InventoryReturn.countDocuments(query),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =========================================================================
  // 4. Stock Transfers (Store-to-Store Logistics)
  // =========================================================================

  public static async createTransfer(
    tenantId: Types.ObjectId,
    userId: Types.ObjectId,
    data: {
      schoolId: string;
      sourceStoreId: string;
      destinationStoreId: string;
      sourceLocationId?: string | null;
      destinationLocationId?: string | null;
      notes?: string;
      items: Array<{
        itemId: string;
        quantity: number;
        batchId?: string | null;
      }>;
    }
  ): Promise<IInventoryTransferDoc> {
    if (data.sourceStoreId === data.destinationStoreId) {
      throw new BadRequestError('Source and Destination stores cannot be identical.');
    }

    const [sourceStore, destStore] = await Promise.all([
      InventoryStore.findOne({ _id: new Types.ObjectId(data.sourceStoreId), tenantId }),
      InventoryStore.findOne({ _id: new Types.ObjectId(data.destinationStoreId), tenantId }),
    ]);
    if (!sourceStore || !destStore) {
      throw new NotFoundError('Source or Destination store not found.');
    }

    const transferNumber = this.generateVoucherNumber('TRF');

    const transfer = await InventoryTransfer.create({
      tenantId,
      schoolId: new Types.ObjectId(data.schoolId),
      transferNumber,
      sourceStoreId: new Types.ObjectId(data.sourceStoreId),
      destinationStoreId: new Types.ObjectId(data.destinationStoreId),
      sourceLocationId: data.sourceLocationId ? new Types.ObjectId(data.sourceLocationId) : undefined,
      destinationLocationId: data.destinationLocationId ? new Types.ObjectId(data.destinationLocationId) : undefined,
      status: StockTransferStatus.REQUESTED,
      requestedByUserId: userId,
      notes: data.notes,
      items: data.items.map((i) => ({
        itemId: new Types.ObjectId(i.itemId),
        quantity: i.quantity,
        batchId: i.batchId ? new Types.ObjectId(i.batchId) : undefined,
      })),
    });

    return transfer;
  }

  public static async updateTransferStatus(
    tenantId: Types.ObjectId,
    userId: Types.ObjectId,
    transferId: string,
    status: StockTransferStatus,
    remarks?: string
  ): Promise<IInventoryTransferDoc> {
    const transfer = await InventoryTransfer.findOne({
      _id: new Types.ObjectId(transferId),
      tenantId,
    });

    if (!transfer) {
      throw new NotFoundError('Stock transfer record not found.');
    }

    // DISPATCH (IN_TRANSIT): Decrement source store stock
    if (
      status === StockTransferStatus.IN_TRANSIT &&
      (transfer.status === StockTransferStatus.REQUESTED || transfer.status === StockTransferStatus.APPROVED)
    ) {
      for (const item of transfer.items) {
        const qty = item.quantity;
        const stock = await InventoryStock.findOneAndUpdate(
          {
            tenantId,
            storeId: transfer.sourceStoreId,
            itemId: item.itemId,
            quantityOnHand: { $gte: qty },
          },
          {
            $inc: { quantityOnHand: -qty, quantityAvailable: -qty },
          },
          { new: true }
        );

        if (!stock) {
          throw new BadRequestError(
            `Insufficient stock in source store for item ${item.itemId}. Transfer cannot be dispatched.`
          );
        }

        // Ledger entry for source dispatch
        await InventoryStockLedger.create({
          tenantId,
          schoolId: transfer.schoolId,
          itemId: item.itemId,
          storeId: transfer.sourceStoreId,
          movementType: StockMovementType.TRANSFER_OUT,
          quantity: -qty,
          balanceAfter: stock.quantityOnHand,
          referenceType: 'TRANSFER',
          referenceId: transfer.transferNumber,
          actorUserId: userId,
          timestamp: new Date(),
          reason: `Dispatched in transfer ${transfer.transferNumber}`,
        });
      }
      transfer.status = StockTransferStatus.IN_TRANSIT;
      transfer.approvedByUserId = userId;
      transfer.dispatchedAt = new Date();
    }
    // RECEIVE (RECEIVED): Increment destination store stock
    else if (status === StockTransferStatus.RECEIVED && transfer.status === StockTransferStatus.IN_TRANSIT) {
      for (const item of transfer.items) {
        const qty = item.quantity;
        const stock = await InventoryStock.findOneAndUpdate(
          {
            tenantId,
            storeId: transfer.destinationStoreId,
            itemId: item.itemId,
          },
          {
            $inc: { quantityOnHand: qty, quantityAvailable: qty },
            $setOnInsert: {
              schoolId: transfer.schoolId,
              quantityReserved: 0,
              reorderLevel: 5,
              averageCostMinorUnits: 0,
            },
          },
          { upsert: true, new: true }
        );

        // Ledger entry for destination receipt
        await InventoryStockLedger.create({
          tenantId,
          schoolId: transfer.schoolId,
          itemId: item.itemId,
          storeId: transfer.destinationStoreId,
          movementType: StockMovementType.TRANSFER_IN,
          quantity: qty,
          balanceAfter: stock.quantityOnHand,
          referenceType: 'TRANSFER',
          referenceId: transfer.transferNumber,
          actorUserId: userId,
          timestamp: new Date(),
          reason: `Received in transfer ${transfer.transferNumber}`,
        });
      }
      transfer.status = StockTransferStatus.RECEIVED;
      transfer.receivedAt = new Date();
    }
    // CANCEL: Restore source stock if already dispatched
    else if (status === StockTransferStatus.CANCELLED) {
      if (transfer.status === StockTransferStatus.IN_TRANSIT) {
        for (const item of transfer.items) {
          const qty = item.quantity;
          await InventoryStock.findOneAndUpdate(
            {
              tenantId,
              storeId: transfer.sourceStoreId,
              itemId: item.itemId,
            },
            {
              $inc: { quantityOnHand: qty, quantityAvailable: qty },
            }
          );
        }
      }
      transfer.status = StockTransferStatus.CANCELLED;
    } else {
      transfer.status = status;
    }

    if (remarks) {
      transfer.notes = transfer.notes ? `${transfer.notes}\n${remarks}` : remarks;
    }

    await transfer.save();
    return transfer;
  }

  public static async getTransfers(
    tenantId: Types.ObjectId,
    filter: {
      schoolId?: string;
      sourceStoreId?: string;
      destinationStoreId?: string;
      status?: StockTransferStatus;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const query: any = { tenantId };
    if (filter.schoolId) query.schoolId = new Types.ObjectId(filter.schoolId);
    if (filter.sourceStoreId) query.sourceStoreId = new Types.ObjectId(filter.sourceStoreId);
    if (filter.destinationStoreId) query.destinationStoreId = new Types.ObjectId(filter.destinationStoreId);
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      query.transferNumber = { $regex: filter.search, $options: 'i' };
    }

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      InventoryTransfer.find(query)
        .populate('sourceStoreId', 'name code')
        .populate('destinationStoreId', 'name code')
        .populate('requestedByUserId', 'firstName lastName')
        .populate('items.itemId', 'name itemCode unitId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      InventoryTransfer.countDocuments(query),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =========================================================================
  // 5. Stock Adjustments (Audit, Write-Off, Damage, Correction)
  // =========================================================================

  public static async createAdjustment(
    tenantId: Types.ObjectId,
    userId: Types.ObjectId,
    data: {
      schoolId: string;
      storeId: string;
      adjustmentType: StockAdjustmentType;
      reason: StockAdjustmentReason;
      notes?: string;
      items: Array<{
        itemId: string;
        locationId?: string | null;
        batchId?: string | null;
        quantityChange: number;
        currentQuantity: number;
        newQuantity: number;
        unitCostMinorUnits?: number;
        reason?: string;
      }>;
    }
  ): Promise<IInventoryAdjustmentDoc> {
    const store = await InventoryStore.findOne({ _id: new Types.ObjectId(data.storeId), tenantId });
    if (!store) {
      throw new NotFoundError('Store not found.');
    }

    const adjustmentNumber = this.generateVoucherNumber('ADJ');
    const adjustmentItems: any[] = [];

    for (const item of data.items) {
      const stock = await InventoryStock.findOne({
        tenantId,
        storeId: new Types.ObjectId(data.storeId),
        itemId: new Types.ObjectId(item.itemId),
      });

      if (!stock) {
        throw new NotFoundError(`Stock item not found for adjustment on item ${item.itemId}.`);
      }

      // If decrementing, check that we don't drop below zero
      if (item.quantityChange < 0) {
        const absDecrement = Math.abs(item.quantityChange);
        const updated = await InventoryStock.findOneAndUpdate(
          {
            _id: stock._id,
            tenantId,
            quantityOnHand: { $gte: absDecrement },
          },
          {
            $inc: { quantityOnHand: item.quantityChange, quantityAvailable: item.quantityChange },
          },
          { new: true }
        );

        if (!updated) {
          throw new BadRequestError(
            `Adjustment of ${item.quantityChange} exceeds available stock (${stock.quantityOnHand}) for item ${item.itemId}.`
          );
        }
        stock.quantityOnHand = updated.quantityOnHand;
        stock.quantityAvailable = updated.quantityAvailable;
      } else {
        // Incrementing
        stock.quantityOnHand += item.quantityChange;
        stock.quantityAvailable = stock.quantityOnHand - stock.quantityReserved;
        await stock.save();
      }

      const costMinor = item.unitCostMinorUnits || stock.averageCostMinorUnits || 0;
      const itemCostImpact = Money.multiply(costMinor, Math.abs(item.quantityChange));

      // Ledger entry
      await InventoryStockLedger.create({
        tenantId,
        schoolId: new Types.ObjectId(data.schoolId),
        itemId: new Types.ObjectId(item.itemId),
        storeId: new Types.ObjectId(data.storeId),
        locationId: item.locationId ? new Types.ObjectId(item.locationId) : undefined,
        batchId: item.batchId ? new Types.ObjectId(item.batchId) : undefined,
        movementType: item.quantityChange < 0 ? StockMovementType.ADJUSTMENT_OUT : StockMovementType.ADJUSTMENT_IN,
        quantity: item.quantityChange,
        balanceAfter: stock.quantityOnHand,
        unitCostMinorUnits: costMinor,
        totalCostMinorUnits: itemCostImpact,
        referenceType: 'ADJUSTMENT',
        referenceId: adjustmentNumber,
        actorUserId: userId,
        timestamp: new Date(),
        reason: `${data.reason}: ${data.notes || item.reason || ''}`,
      });

      adjustmentItems.push({
        itemId: new Types.ObjectId(item.itemId),
        locationId: item.locationId ? new Types.ObjectId(item.locationId) : undefined,
        batchId: item.batchId ? new Types.ObjectId(item.batchId) : undefined,
        quantityChange: item.quantityChange,
        currentQuantity: item.currentQuantity,
        newQuantity: item.newQuantity,
        unitCostMinorUnits: costMinor,
        reason: item.reason || data.notes,
      });
    }

    const adjustment = await InventoryAdjustment.create({
      tenantId,
      schoolId: new Types.ObjectId(data.schoolId),
      adjustmentNumber,
      storeId: new Types.ObjectId(data.storeId),
      adjustmentType: data.adjustmentType,
      reason: data.reason,
      status: StockAdjustmentStatus.APPROVED,
      actorUserId: userId,
      approvedByUserId: userId,
      approvedAt: new Date(),
      notes: data.notes,
      items: adjustmentItems,
    });

    return adjustment;
  }

  public static async getAdjustments(
    tenantId: Types.ObjectId,
    filter: {
      schoolId?: string;
      storeId?: string;
      status?: StockAdjustmentStatus;
      reason?: StockAdjustmentReason;
      page?: number;
      limit?: number;
    }
  ) {
    const query: any = { tenantId };
    if (filter.schoolId) query.schoolId = new Types.ObjectId(filter.schoolId);
    if (filter.storeId) query.storeId = new Types.ObjectId(filter.storeId);
    if (filter.status) query.status = filter.status;
    if (filter.reason) query.reason = filter.reason;

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      InventoryAdjustment.find(query)
        .populate('storeId', 'name code')
        .populate('actorUserId', 'firstName lastName')
        .populate('approvedByUserId', 'firstName lastName')
        .populate('items.itemId', 'name itemCode unitId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      InventoryAdjustment.countDocuments(query),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
