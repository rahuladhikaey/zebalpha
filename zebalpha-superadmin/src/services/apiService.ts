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

  // Weekly Settlements & Revenue
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
  }
};
