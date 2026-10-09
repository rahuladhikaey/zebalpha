import { apiFetch } from '@shared/utils/apiClient';

export const apiService = {
  // Admin Auth
  login: (credentials: any) => apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ ...credentials, role: 'super_admin' }) }),
  getProfile: () => apiFetch('/api/auth/me'),

  // Products & Categories
  getProducts: () => apiFetch('/api/products'),
  createProduct: (data: any) => apiFetch('/api/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string | number, data: any) => apiFetch(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string | number) => apiFetch(`/api/products/${id}`, { method: 'DELETE' }),

  getCategories: () => apiFetch('/api/products/categories'),
  createCategory: (name: string) => apiFetch('/api/products/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  updateCategory: (id: string | number, name: string) => apiFetch(`/api/products/categories/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteCategory: (id: string | number) => apiFetch(`/api/products/categories/${id}`, { method: 'DELETE' }),

  // Orders
  getOrders: () => apiFetch('/api/orders'),
  updateOrderStatus: (id: string | number, data: any) => apiFetch(`/api/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOrder: (id: string | number) => apiFetch(`/api/orders/${id}`, { method: 'DELETE' }),

  // Store Settings & Shipments
  getStoreSettings: () => apiFetch('/api/admin/store-settings'),
  updateStoreSetting: (key: string, value: any) => apiFetch('/api/admin/store-settings', { method: 'POST', body: JSON.stringify({ key, value }) }),
  // Media Upload (Supabase A Storage Bucket -> Supabase A)
  uploadBrandingAsset: (fileName: string, fileBufferBase64: string, mimeType?: string) => apiFetch('/api/uploads/admin-branding-asset', { method: 'POST', body: JSON.stringify({ fileName, fileBufferBase64, mimeType }) }),

  // Administrative Seller Controls
  suspendSeller: (id: string, reason: string) => apiFetch(`/api/admin/sellers/${id}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reactivateSeller: (id: string) => apiFetch(`/api/admin/sellers/${id}/reactivate`, { method: 'POST' }),
  softDeleteSeller: (id: string, reason: string) => apiFetch(`/api/admin/sellers/${id}/soft-delete`, { method: 'POST', body: JSON.stringify({ reason }) }),
  permanentDeleteSeller: (id: string, passwordConfirm: string) => apiFetch(`/api/admin/sellers/${id}/permanent-delete`, { method: 'POST', body: JSON.stringify({ passwordConfirm }) }),

  // Production Settlement & Payout Engine
  getSettlementOverview: () => apiFetch('/api/settlements/overview'),
  getPayoutRequests: (params: any = {}) => {
    const query = new URLSearchParams();
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        query.append(k, params[k]);
      }
    });
    return apiFetch(`/api/settlements/payouts?${query.toString()}`);
  },
  getPayoutDetails: (id: string) => apiFetch(`/api/settlements/payouts/${id}`),
  getSellerFinancialDetails: (sellerId: string) => apiFetch(`/api/settlements/seller-financials/${sellerId}`),
  reconcileSinglePayout: (id: string, reason?: string) => apiFetch(`/api/settlements/reconcile/${id}`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reconcileAllPayouts: (reason?: string) => apiFetch('/api/settlements/reconcile-all', { method: 'POST', body: JSON.stringify({ reason }) }),
  getAdminAuditLogs: (params: any = {}) => {
    const query = new URLSearchParams();
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        query.append(k, params[k]);
      }
    });
    return apiFetch(`/api/settlements/audit-logs?${query.toString()}`);
  },
  triggerPayoutWorker: () => apiFetch('/api/settlements/worker/trigger', { method: 'POST' }),

  // Legacy Weekly Settlements & Revenue
  getSettlements: (params: any = {}) => {
    const query = new URLSearchParams();
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        query.append(k, params[k]);
      }
    });
    return apiFetch(`/api/settlements?${query.toString()}`);
  },
  getSellerSettlements: (sellerId: string) => apiFetch(`/api/settlements/seller/${sellerId}`),
  getSettlementDetails: (id: string) => apiFetch(`/api/settlements/details/${id}`),
  paySettlement: (id: string, data: any) => apiFetch(`/api/settlements/${id}/pay`, { method: 'POST', body: JSON.stringify(data) }),
  getRevenueSummary: (params: any = {}) => {
    const query = new URLSearchParams();
    if (params.sellerId) query.append('sellerId', params.sellerId);
    return apiFetch(`/api/settlements/revenue/summary?${query.toString()}`);
  },

  // Razorpay Route Marketplace Settlements
  getRouteBatches: (params: any = {}) => {
    const query = new URLSearchParams();
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        query.append(k, params[k]);
      }
    });
    return apiFetch(`/api/settlements/batches?${query.toString()}`);
  },
  holdRouteBatch: (id: string, reason: string) => apiFetch(`/api/settlements/batches/${id}/hold`, { method: 'POST', body: JSON.stringify({ reason }) }),
  releaseRouteBatch: (id: string, reason?: string) => apiFetch(`/api/settlements/batches/${id}/release`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reconcileRouteBatch: (id: string) => apiFetch(`/api/settlements/batches/${id}/reconcile`, { method: 'POST' }),
  triggerRouteSweep: () => apiFetch('/api/settlements/sweep/trigger', { method: 'POST' }),

  // Platform Finance Configuration & Versioning
  getActiveFinanceConfig: () => apiFetch('/api/finance/config/active'),
  listFinanceConfigVersions: () => apiFetch('/api/finance/config/versions'),
  getFinanceConfigVersion: (version: number | string) => apiFetch(`/api/finance/config/versions/${version}`),
  createDraftFinanceConfig: (data: any) => apiFetch('/api/finance/config/draft', { method: 'POST', body: JSON.stringify(data) }),
  publishFinanceConfig: (id: string, data: any = {}) => apiFetch(`/api/finance/config/${id}/publish`, { method: 'POST', body: JSON.stringify(data) }),
  rollbackFinanceConfig: (data: { targetVersion: number; reason: string }) => apiFetch('/api/finance/config/rollback', { method: 'POST', body: JSON.stringify(data) }),
  previewFinanceImpact: (data: any) => apiFetch('/api/finance/config/preview', { method: 'POST', body: JSON.stringify(data) }),
  getOrderFinancialSnapshot: (orderId: string) => apiFetch(`/api/finance/snapshots/order/${orderId}`)
};


