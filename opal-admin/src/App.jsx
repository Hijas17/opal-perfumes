import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ProductList from './pages/products/ProductList.jsx'
import ProductForm from './pages/products/ProductForm.jsx'
import BulkUpload from './pages/products/BulkUpload.jsx'
import Categories from './pages/Categories.jsx'
import Inquiries from './pages/Inquiries.jsx'
import Media from './pages/Media.jsx'
import Settings from './pages/Settings.jsx'

function AppRoutes() {
  const { isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="products" element={<ProductList />} />
                <Route path="products/new" element={<ProductForm />} />
                <Route path="products/bulk-upload" element={<BulkUpload />} />
                <Route path="products/:id/edit" element={<ProductForm />} />
                <Route path="categories" element={<Categories />} />
                <Route path="inquiries" element={<Inquiries />} />
                <Route path="media" element={<Media />} />
                <Route path="settings" element={<Settings />} />
                <Route path="" element={<Navigate to="dashboard" replace />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
