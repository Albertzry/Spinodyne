import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import AppLayout from './components/Layout/AppLayout';
import Login from './pages/Login';
import Inference from './pages/Inference/Inference';

console.log('App.tsx is loading...');

const Dashboard: React.FC = () => (
  <div className="clinical-card p-8 bg-white rounded-xl border border-slate-200 shadow-sm">
    <h1 className="clinical-heading text-2xl font-bold mb-4 text-slate-800">Dashboard</h1>
    <p className="clinical-text text-slate-600">Welcome to Spinodyne Medical AI Platform</p>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  console.log('ProtectedRoute check, token:', token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <AppLayout>{children}</AppLayout>;
};

const App: React.FC = () => {
  console.log('App component rendering...');
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0ea5e9',
          borderRadius: 8,
          fontFamily: 'Inter, system-ui, sans-serif',
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
          
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
