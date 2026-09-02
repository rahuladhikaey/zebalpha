import { apiFetch } from '@shared/utils/apiClient';

export const apiService = {
  // Auth APIs
  login: (credentials: any) => apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData: any) => apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getProfile: () => apiFetch('/api/auth/me'),

  // Product & Category APIs
  getProducts: (params?: { category?: string; activeOnly?: boolean; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch(`/api/products${query ? `?${query}` : ''}`);
  },
  getProductById: (id: string | number) => apiFetch(`/api/products/${id}`),
  getCategories: () => apiFetch('/api/products/categories'),

  // Order & Payment APIs
  createOrder: (orderData: any) => apiFetch('/api/orders', { method: 'POST', body: JSON.stringify(orderData) }),
  createRazorpayOrder: (amount: number) => apiFetch('/api/payments/create-order', { method: 'POST', body: JSON.stringify({ amount }) }),
  verifyPayment: (paymentData: any) => apiFetch('/api/payments/verify-payment', { method: 'POST', body: JSON.stringify(paymentData) }),

  // Store Settings & Notifications
  getStoreSetting: (key: string) => apiFetch(`/api/admin/store-settings?key=${key}`),
  createNotifyRequest: (email: string, productId: string | number) =>
    apiFetch('/api/notifications/notify', { method: 'POST', body: JSON.stringify({ email, productId }) }),

  // Virtual Try-On API
  executeVirtualTryOn: (payload: { personImage: string; productId?: string | number; garmentImage?: string; category?: string }) =>
    apiFetch('/api/virtual-try-on', { method: 'POST', body: JSON.stringify(payload) }),
};
