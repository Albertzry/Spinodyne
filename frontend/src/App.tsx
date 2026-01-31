import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { useTranslation } from 'react-i18next';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import MainLayout from './layouts/MainLayout';
import Inference from './pages/Inference';
import Records from './pages/Records';
import ResultDashboard from './pages/ResultDashboard';
import theme from './theme/themeConfig';

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/inference" element={<Inference />} />
        <Route path="/records" element={<Records />} />
        <Route path="/result/:id" element={<ResultDashboard />} />
        <Route path="*" element={<Navigate to="/inference" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  const { i18n } = useTranslation();

  return (
    <ConfigProvider theme={theme} locale={i18n.language === 'zh' ? zhCN : enUS}>
      <Router>
        <MainLayout>
          <AnimatedRoutes />
        </MainLayout>
      </Router>
    </ConfigProvider>
  );
};

export default App;
