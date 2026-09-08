import { Schema, model, Types } from 'mongoose';
import { IInventoryItem, IStockTransaction, StockTxnType } from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

export interface IInventoryItemDoc extends Omit<IInventoryItem, 'id' | 'tenantId' | 'schoolId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
}

export interface IStockTransactionDoc extends Omit<
  IStockTransaction,
  'id' | 'tenantId' | 'schoolId' | 'itemId' | 'recipientId' | 'recordedBy'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  itemId: Types.ObjectId;
  recipientId?: Types.ObjectId;
  recordedBy: Types.ObjectId;
}

// 1. InventoryItem Schema
const InventoryItemSchema = new Schema<IInventoryItemDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, uppercase: true, trim: true },
    category: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    quantityOnHand: { type: Number, required: true, default: 0, min: 0 },
    reorderLevel: { type: Number, required: true, default: 5, min: 0 },
    unitPrice: { type: Number, required: true, default: 0, min: 0 },
    location: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
InventoryItemSchema.plugin(tenantPlugin);
InventoryItemSchema.plugin(softDeletePlugin);
InventoryItemSchema.index({ tenantId: 1, schoolId: 1, sku: 1 }, { unique: true });

// 2. StockTransaction Schema
const StockTransactionSchema = new Schema<IStockTransactionDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
    transactionType: {
      type: String,
      enum: ['PURCHASE', 'ISSUE', 'RETURN', 'ADJUSTMENT', 'DISPOSAL'] as StockTxnType[],
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, min: 0 },
    totalAmount: { type: Number, min: 0 },
    referenceNumber: { type: String, trim: true },
    recipientType: { type: String, enum: ['STUDENT', 'STAFF', 'DEPARTMENT'] },
    recipientId: { type: Schema.Types.ObjectId },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    remarks: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: '__v' }
);
StockTransactionSchema.plugin(tenantPlugin);
StockTransactionSchema.index({ tenantId: 1, schoolId: 1, itemId: 1, createdAt: -1 });

export const InventoryItem = model<IInventoryItemDoc>('InventoryItem', InventoryItemSchema);
export const StockTransaction = model<IStockTransactionDoc>(
  'StockTransaction',
  StockTransactionSchema
);
