import { api, apiUpload } from './client';

// auth
export const login = (email, password) => api('/auth/login', { method: 'POST', body: { email, password } });
export const resendOtp = (challengeId) => api('/auth/otp/resend', { method: 'POST', body: { challengeId } });
export const verifyLoginOtp = (challengeId, otp) => api('/auth/login/verify', { method: 'POST', body: { challengeId, otp } });
export const verifyRegistrationOtp = (challengeId, otp) => api('/auth/register/verify', { method: 'POST', body: { challengeId, otp } });
export const requestPasswordReset = (email) => api('/auth/password/forgot', { method: 'POST', body: { email } });
export const resetPassword = (challengeId, otp, newPassword) => api('/auth/password/reset', { method: 'POST', body: { challengeId, otp, newPassword } });
export const register = (data) => api('/auth/register', { method: 'POST', body: data });
export const getMe = () => api('/auth/me');
export const updateProfile = (data) => api('/auth/me', { method: 'PUT', body: data });

// properties (public)
export const getProperties = (params = {}) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
  return api(`/properties${qs ? `?${qs}` : ''}`);
};
export const getProperty = (id) => api(`/properties/${id}`);
export const getReviews = (id) => api(`/properties/${id}/reviews`);
export const addReview = (id, rating, comment) => api(`/properties/${id}/reviews`, { method: 'POST', body: { rating, comment } });

// bookings / favorites / tickets / notifications
export const getMyBookings = () => api('/bookings/me');
export const cancelBooking = (dbId) => api(`/bookings/${dbId}/cancel`, { method: 'PUT' });
export const getFavorites = () => api('/favorites');
export const toggleFavorite = (propertyId) => api(`/favorites/${propertyId}`, { method: 'POST' });
export const getMyTickets = () => api('/tickets/me');
export const createTicket = (subject, message) => api('/tickets', { method: 'POST', body: { subject, message } });
export const getNotifications = () => api('/notifications');
export const markNotificationRead = (id) => api(`/notifications/${id}/read`, { method: 'PUT' });
export const markAllNotificationsRead = () => api('/notifications/read-all', { method: 'PUT' });

// owner
export const getOwnerProperties = () => api('/owner/properties');
export const createOwnerProperty = (data) => api('/owner/properties', { method: 'POST', body: data });
export const getOwnerBookings = () => api('/owner/bookings');
export const getOwnerStats = () => api('/owner/stats');

// admin
export const getAdminStats = () => api('/admin/stats');
export const getPendingProperties = () => api('/admin/properties/pending');
export const approveProperty = (id) => api(`/admin/properties/${id}/approve`, { method: 'PUT' });
export const rejectProperty = (id) => api(`/admin/properties/${id}/reject`, { method: 'PUT' });
export const getAdminTickets = () => api('/admin/tickets');
export const updateAdminTicket = (id, data) => api(`/admin/tickets/${id}`, { method: 'PUT', body: data });
export const getAdminUsers = () => api('/admin/users');
export const toggleAdminUser = (id) => api(`/admin/users/${id}/toggle`, { method: 'PUT' });

// search (admin / owner)
export const searchAdminUsers = ({ q = '', role = 'ALL' } = {}) =>
  api(`/admin/users?q=${encodeURIComponent(q)}&role=${encodeURIComponent(role)}`);
export const getAdminUser = (id) => api(`/admin/users/${id}`);
export const getOwnerCustomers = (q = '') => api(`/owner/customers?q=${encodeURIComponent(q)}`);

// owner KYC / DigiLocker
export const startDigiLocker = (data) => api('/kyc/digilocker/start', { method: 'POST', body: data });
export const getMyKyc = () => api('/kyc/me');
export const ckycLookup = (data) => api('/kyc/ckyc-lookup', { method: 'POST', body: data });
export const ckycConfirm = (data) => api('/kyc/ckyc-confirm', { method: 'POST', body: data });
export const submitManualKyc = (data) => api('/kyc/manual', { method: 'POST', body: data });

// admin KYC review
export const getAdminKyc = (status = 'PENDING_REVIEW') => api(`/admin/kyc?status=${encodeURIComponent(status)}`);
export const approveKyc = (id) => api(`/admin/kyc/${id}/approve`, { method: 'PUT' });
export const rejectKyc = (id, remarks) => api(`/admin/kyc/${id}/reject`, { method: 'PUT', body: { remarks } });

// profile photo / property photos / property edit
export const uploadAvatar = (formData) => apiUpload('/auth/me/avatar', formData);
export const removeAvatar = () => api('/auth/me/avatar', { method: 'DELETE' });
export const uploadPropertyPhotos = (formData) => apiUpload('/owner/uploads', formData);
export const updateOwnerProperty = (id, data) => api(`/owner/properties/${id}`, { method: 'PUT', body: data });

// Razorpay payments
export const createPaymentOrder = (data) => api('/payments/order', { method: 'POST', body: data });
export const verifyPayment = (data) => api('/payments/verify', { method: 'POST', body: data });
export const getMyPayments = () => api('/payments/me');
export const getAdminPayments = (status = 'ALL') => api(`/admin/payments?status=${encodeURIComponent(status)}`);
export const adminRefundPayment = (id, amount) => api(`/admin/payments/${id}/refund`, { method: 'POST', body: amount ? { amount } : {} });
export const getAdminWebhooks = () => api('/admin/webhooks');

// sharing: roommate profile, roommates, eligibility, residents
export const getTenantProfile = () => api('/profile/tenant');
export const saveTenantProfile = (data) => api('/profile/tenant', { method: 'PUT', body: data });
export const getRoommates = (propertyId) => api(`/properties/${propertyId}/roommates`);
export const getEligibility = (propertyId) => api(`/properties/${propertyId}/eligibility`);
export const getResidents = (propertyId) => api(`/owner/properties/${propertyId}/residents`);
export const addResident = (propertyId, data) => api(`/owner/properties/${propertyId}/residents`, { method: 'POST', body: data });
export const updateResident = (propertyId, id, data) => api(`/owner/properties/${propertyId}/residents/${id}`, { method: 'PUT', body: data });
export const deleteResident = (propertyId, id) => api(`/owner/properties/${propertyId}/residents/${id}`, { method: 'DELETE' });


// Live support chat (polling keeps messages fresh without a separate WebSocket server)
export const getChatMessages = () => api('/chat/messages');
export const sendChatMessage = (message) => api('/chat/messages', { method: 'POST', body: { message } });
export const getAdminChatConversations = () => api('/chat/admin/conversations');
export const getAdminChatMessages = (userId) => api(`/chat/admin/${userId}/messages`);
export const replyAdminChat = (userId, message) => api(`/chat/admin/${userId}/messages`, { method: 'POST', body: { message } });

// Private property evidence documents
export const uploadPropertyDocument = (propertyId, documentType, file) => {
  const data = new FormData(); data.append('documentType', documentType); data.append('file', file);
  return apiUpload(`/property-documents/property/${propertyId}`, data);
};
export const getPropertyDocuments = (propertyId) => api(`/property-documents/property/${propertyId}`);
export const getPendingPropertyDocuments = () => api('/property-documents/admin/pending');
export const reviewPropertyDocument = (id, status, remarks = '') => api(`/property-documents/admin/${id}/review`, { method: 'PUT', body: { status, remarks } });
export const propertyDocumentDownloadUrl = (id) => `${import.meta.env.VITE_API_URL || '/api'}/property-documents/${id}/download`;
