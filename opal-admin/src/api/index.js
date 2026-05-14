import axios from 'axios'

export const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL || 'http://localhost:8000/uploads'

export function getImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${UPLOADS_URL}/${path.replace(/^\//, '')}`
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
})

// Request interceptor: attach Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('opal_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('opal_token')
      localStorage.removeItem('opal_admin')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth
export const login = (email, password) =>
  api.post('/auth/login', { email, password })

export const logout = () =>
  api.post('/auth/logout')

// Dashboard
export const getDashboard = () =>
  api.get('/admin/dashboard')

// Products
export const getAdminProducts = (params) =>
  api.get('/admin/products', { params })

export const getAdminProduct = (id) =>
  api.get(`/admin/products/${id}`)

export const createProduct = (formData) =>
  api.post('/admin/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const updateProduct = (id, formData) =>
  api.post(`/admin/products/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params: { _method: 'PUT' },
  })

export const deleteProduct = (id) =>
  api.delete(`/admin/products/${id}`)

export const bulkImportProducts = (rows) =>
  api.post('/admin/products/bulk-import', { rows })

// Categories
export const getAdminCategories = () =>
  api.get('/admin/categories')

export const createCategory = (data) =>
  api.post('/admin/categories', data)

export const updateCategory = (id, data) =>
  api.put(`/admin/categories/${id}`, data)

export const deleteCategory = (id) =>
  api.delete(`/admin/categories/${id}`)

// Inquiries
export const getInquiries = (params) =>
  api.get('/admin/inquiries', { params })

export const updateInquiry = (id, data) =>
  api.put(`/admin/inquiries/${id}`, data)

export const deleteInquiry = (id) =>
  api.delete(`/admin/inquiries/${id}`)

export const exportInquiries = () =>
  api.get('/admin/inquiries/export', { responseType: 'blob' })

// Media
export const getMedia = () =>
  api.get('/admin/media')

export const uploadMedia = (formData) =>
  api.post('/admin/media', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const deleteMedia = (filename) =>
  api.delete(`/admin/media/${encodeURIComponent(filename)}`)

// Settings
export const getAdminSettings = () =>
  api.get('/admin/settings')

export const updateSettings = (data) =>
  api.put('/admin/settings', data)

export const uploadSettingImage = (formData) =>
  api.post('/admin/settings/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export default api
