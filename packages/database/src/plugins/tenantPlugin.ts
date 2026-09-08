import { Schema, Document, Query, Types } from 'mongoose';

export interface TenantDocument extends Document {
  tenantId: Types.ObjectId;
}

export function tenantPlugin(schema: Schema): void {
  // Ensure tenantId path exists
  if (!schema.path('tenantId')) {
    schema.add({
      tenantId: {
        type: Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true,
      },
    });
  }

  // Pre-save hook: prevent modifying tenantId on existing documents
  schema.pre('save', function (next) {
    if (this.isModified('tenantId') && !this.isNew) {
      return next(new Error('Cross-tenant mutation prohibited: tenantId is immutable.'));
    }
    next();
  });

  // Pre-update hook: prevent modifying tenantId via findOneAndUpdate / updateOne / updateMany
  schema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function () {
    const update = this.getUpdate() as any;
    const filter = this.getFilter() as any;
    if (update) {
      const newTenantId = update.tenantId !== undefined ? update.tenantId : update.$set?.tenantId;
      if (newTenantId !== undefined) {
        if (filter && filter.tenantId !== undefined) {
          if (newTenantId.toString() !== filter.tenantId.toString()) {
            throw new Error('Cross-tenant mutation prohibited: tenantId is immutable.');
          }
        } else {
          // If query filter didn't even scope by tenantId, updating tenantId is prohibited
          throw new Error('Cross-tenant mutation prohibited: tenantId is immutable.');
        }
      }
    }
  });

  // Query middleware: automatically apply tenantId filter if provided in query options or scope
  schema.pre(
    ['find', 'findOne', 'findOneAndUpdate', 'updateMany', 'countDocuments', 'deleteMany'],
    function (this: Query<any, any>) {
      const options = this.getOptions();
      if (options && options.skipTenantFilter) {
        return;
      }

      const filter = this.getFilter();
      if (options && options.tenantId && !filter.tenantId) {
        this.where({ tenantId: options.tenantId });
      }
    }
  );
}
