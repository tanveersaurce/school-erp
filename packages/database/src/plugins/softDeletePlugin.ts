import { Schema, Document, Query, Types } from 'mongoose';

export interface SoftDeleteDocument extends Document {
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: Types.ObjectId | null;
  softDelete(deletedByUserId?: string | Types.ObjectId): Promise<this>;
  restore(): Promise<this>;
}

export function softDeletePlugin(schema: Schema): void {
  // Ensure soft delete fields exist individually
  if (!schema.path('isDeleted')) {
    schema.add({
      isDeleted: {
        type: Boolean,
        default: false,
        index: true,
      },
    });
  }

  if (!schema.path('deletedAt')) {
    schema.add({
      deletedAt: {
        type: Date,
        default: null,
      },
    });
  }

  if (!schema.path('deletedBy')) {
    schema.add({
      deletedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
    });
  }

  // Query middleware: filter out soft-deleted documents by default
  schema.pre(
    ['find', 'findOne', 'findOneAndUpdate', 'countDocuments'],
    function (this: Query<any, any>) {
      const options = this.getOptions();
      if (options && (options.includeDeleted || options.withDeleted)) {
        return;
      }

      const filter = this.getFilter();
      if (filter.isDeleted === undefined) {
        this.where({ isDeleted: false });
      }
    }
  );

  // Soft delete instance method
  schema.methods.softDelete = function (deletedByUserId?: string | Types.ObjectId) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    if (deletedByUserId) {
      this.deletedBy = new Types.ObjectId(deletedByUserId);
    } else {
      this.deletedBy = null;
    }
    return this.save();
  };

  // Restore instance method
  schema.methods.restore = function () {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    return this.save();
  };
}
