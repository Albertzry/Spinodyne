import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import AppLayout from './components/Layout/AppLayout';
import Login from './pages/Login';
import Inference from './pages/Inference/Inference';

// Placeholder Components
const Dashboard: React.FC = () => (
  <div className="clinical-card p-8">
    <h1 className="clinical-heading text-2xl mb-4">Dashboard</h1>
    <p className="clinical-text">Welcome to Spinodyne Medical AI Platform</p>
  </div>
);

const Patients: React.FC = () => (
  <div className="clinical-card p-8">
    <h1 className="clinical-heading text-2xl mb-4">Patients</h1>
    <p className="clinical-text">Patient management system</p>
  </div>
);

const SettingsPage: React.FC = () => (
  <div className="clinical-card p-8">
    <h1 className="clinical-heading text-2xl mb-4">Settings</h1>
    <p className="clinical-text">Configure your platform preferences</p>
  </div>
);

// Protected Route Wrapper (Simplified)
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <AppLayout>{children}</AppLayout>;
};

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0ea5e9', // TotalSpine Blue
          colorInfo: '#0ea5e9',
          borderRadius: 8,
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        },
        components: {
          Layout: {
            siderBg: '#ffffff',
            headerBg: '#ffffff',
          },
          Menu: {
            itemBg: 'transparent',
            itemSelectedBg: '#e0f2fe',
            itemSelectedColor: '#0ea5e9',
            itemHoverBg: '#f0f9ff',
            itemHoverColor: '#0ea5e9',
          },
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/inference" element={
            <ProtectedRoute>
              <Inference />
            </ProtectedRoute>
          } />
          
          <Route path="/patients" element={
            <ProtectedRoute>
              <Patients />
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
