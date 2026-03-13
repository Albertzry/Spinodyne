import React from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { useTranslation } from 'react-i18next';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import MainLayout from './layouts/MainLayout';
import Inference from './pages/Inference';
import Records from './pages/Records';
import ResultDashboard from './pages/ResultDashboard';
import ComparisonDashboard from './pages/ComparisonDashboard';
import appTheme from './theme/themeConfig';
import { ThemeProvider, useTheme } from './context/ThemeContext';

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/inference" element={<Inference />} />
        <Route path="/records" element={<Records />} />
        <Route path="/result/:id" element={<ResultDashboard />} />
        <Route path="/compare/:oldId/:newId" element={<ComparisonDashboard />} />
        <Route path="*" element={<Navigate to="/inference" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

const AppInner: React.FC = () => {
  const { i18n } = useTranslation();
  const { isDarkMode, fontScale } = useTheme();

  const currentTheme = {
    ...appTheme,
    algorithm: isDarkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      ...appTheme.token,
      fontSize: Math.round(14 * fontScale),
      // Override basic tokens for dark mode for better contrast
      colorTextBase: isDarkMode ? '#E2E8F0' : '#475569',
      colorTextHeading: isDarkMode ? '#F1F5F9' : '#1E293B',
      colorBgBase: isDarkMode ? '#0F172A' : '#FFFFFF',
      colorBgLayout: isDarkMode ? 'transparent' : '#F5F7FA', // Handle layout bg via CSS
      colorBorder: isDarkMode ? '#334155' : '#E2E8F0',
    },
    components: {
      ...appTheme.components,
      Layout: {
        ...appTheme.components?.Layout,
        bodyBg: 'transparent',
        headerBg: isDarkMode ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.75)',
        siderBg: isDarkMode ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.75)',
      },
      Menu: {
        ...appTheme.components?.Menu,
        itemSelectedBg: isDarkMode ? 'rgba(0, 106, 254, 0.15)' : '#EFF6FF',
        itemColor: isDarkMode ? '#94A3B8' : 'rgba(0, 0, 0, 0.88)',
        itemHoverColor: isDarkMode ? '#E2E8F0' : '#006AFE',
      },
      Input: {
        colorBgContainer: isDarkMode ? 'rgba(15, 23, 42, 0.8)' : '#F8FAFC',
        colorBorder: isDarkMode ? '#334155' : '#E2E8F0',
        activeBorderColor: '#006AFE',
        colorTextPlaceholder: isDarkMode ? '#64748B' : '#94A3B8',
      },
      Select: {
        colorBgContainer: isDarkMode ? 'rgba(15, 23, 42, 0.8)' : '#F8FAFC',
        colorBorder: isDarkMode ? '#334155' : '#E2E8F0',
        optionSelectedBg: isDarkMode ? 'rgba(0, 106, 254, 0.15)' : '#EFF6FF',
      },
      DatePicker: {
        colorBgContainer: isDarkMode ? 'rgba(15, 23, 42, 0.8)' : '#F8FAFC',
        colorBorder: isDarkMode ? '#334155' : '#E2E8F0',
      },
      Table: {
        colorBgContainer: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : '#FFFFFF',
        headerBg: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : '#FAFAFA',
        headerColor: isDarkMode ? '#E2E8F0' : 'rgba(0, 0, 0, 0.88)',
        rowHoverBg: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : '#FAFAFA',
        headerSortActiveBg: isDarkMode ? 'rgba(0, 106, 254, 0.1)' : '#F5F5F5',
        headerSortHoverBg: isDarkMode ? 'rgba(0, 106, 254, 0.15)' : '#F0F0F0',
        borderColor: isDarkMode ? '#334155' : '#F0F0F0',
      },
      Card: {
        colorBgContainer: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#FFFFFF',
        colorBorderSecondary: isDarkMode ? '#334155' : '#F0F0F0',
      },
      Descriptions: {
        colorText: isDarkMode ? '#E2E8F0' : 'rgba(0, 0, 0, 0.88)',
        colorTextSecondary: isDarkMode ? '#94A3B8' : 'rgba(0, 0, 0, 0.45)',
      },
      Typography: {
        colorTextHeading: isDarkMode ? '#F1F5F9' : '#1E293B',
        colorTextDescription: isDarkMode ? '#94A3B8' : 'rgba(0, 0, 0, 0.45)',
        colorText: isDarkMode ? '#E2E8F0' : 'rgba(0, 0, 0, 0.88)',
      }
    }
  };

  return (
    <ConfigProvider theme={currentTheme} locale={i18n.language === 'zh' ? zhCN : enUS}>
      <Router>
        <MainLayout>
          <AnimatedRoutes />
        </MainLayout>
      </Router>
    </ConfigProvider>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
};

export default App;
