export interface IInventoryItem {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  quantityOnHand: number;
  reorderLevel: number;
  unitPrice: number;
  location?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type StockTxnType = 'PURCHASE' | 'ISSUE' | 'RETURN' | 'ADJUSTMENT' | 'DISPOSAL';

export interface IStockTransaction {
  id: string;
  tenantId: string;
  schoolId: string;
  itemId: string;
  transactionType: StockTxnType;
  quantity: number;
  unitPrice?: number;
  totalAmount?: number;
  referenceNumber?: string;
  recipientType?: 'STUDENT' | 'STAFF' | 'DEPARTMENT';
  recipientId?: string;
  recordedBy: string;
  remarks?: string;
  createdAt: Date;
}
