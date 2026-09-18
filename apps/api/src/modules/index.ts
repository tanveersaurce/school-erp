export * from './auth/auth.routes.js';
export * from './auth/auth.service.js';
export * from './auth/session.service.js';
export * from './auth/token.service.js';
export * from './auth/password.service.js';
export * from './auth/email.service.js';
export * from './rbac/rbac.routes.js';
export * from './rbac/rbac.service.js';
export * from './rbac/policies/resource.policy.js';
export * from './tenant/tenant.routes.js';
export * from './tenant/tenant.service.js';
export * from './employee/employee.routes.js';
export * from './employee/employee.service.js';
export * from './student/student.routes.js';
export * from './student/student.service.js';
export * from './academic/academic.routes.js';
export * from './academic/academic.service.js';
export * from './timetable/index.js';
export * from './attendance/index.js';
export * from './assignment/index.js';
export * from './examination/index.js';
export * from './finance/index.js';
export * from './hr/index.js';
export * from './library/index.js';
export * from './transport/index.js';
export * from './hostel/index.js';
export {
  inventoryRouter,
  InventoryController,
  InventoryPolicy,
  InventoryCatalogService,
  InventoryStoreService,
  InventoryStockService,
  InventoryMovementService,
  InventoryStocktakeService,
  InventoryAssetService,
  InventoryReportsService,
} from './inventory/index.js';
export * from './communication/index.js';

