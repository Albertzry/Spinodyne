import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import AppLayout from './components/Layout/AppLayout';
import Login from './pages/Login';
import Inference from './pages/Inference/Inference';
import PatientRecords from './pages/PatientRecords/PatientRecords';
import ResultView from './pages/ResultView/ResultView';

console.log('App.tsx is loading...');

const Dashboard: React.FC = () => (
  <div className="clinical-card p-8 bg-white rounded-xl border border-slate-200 shadow-sm">
    <h1 className="clinical-heading text-2xl font-bold mb-4 text-slate-800">Dashboard</h1>
    <p className="clinical-text text-slate-600">Welcome to Spinodyne Medical AI Platform</p>
    <div className="mt-6 grid grid-cols-3 gap-4">
      <div className="p-6 bg-sky-50 rounded-lg border border-sky-100">
        <h3 className="text-lg font-semibold text-sky-900 mb-2">AI Inference</h3>
        <p className="text-sm text-sky-700">Upload medical images for automated spinal analysis</p>
      </div>
      <div className="p-6 bg-green-50 rounded-lg border border-green-100">
        <h3 className="text-lg font-semibold text-green-900 mb-2">Patient Records</h3>
        <p className="text-sm text-green-700">View and manage all patient analysis records</p>
      </div>
      <div className="p-6 bg-purple-50 rounded-lg border border-purple-100">
        <h3 className="text-lg font-semibold text-purple-900 mb-2">3D Visualization</h3>
        <p className="text-sm text-purple-700">Interactive 3D viewer for spinal structures</p>
      </div>
    </div>
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

          <Route path="/patients" element={
            <ProtectedRoute>
              <PatientRecords />
            </ProtectedRoute>
          } />

          <Route path="/result/:taskId" element={
            <ProtectedRoute>
              <ResultView />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
