import React, { useState } from 'react';
import { Layout, Button } from 'antd';
import { Upload as UploadIcon, FileText, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ThemeSwitcher from '../components/ThemeSwitcher';
import { useTheme } from '../context/ThemeContext';

const { Content } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();

  const menuItems = [
    {
      key: '/inference',
      icon: <UploadIcon size={20} />,
      label: t('inference'),
    },
    {
      key: '/records',
      icon: <FileText size={20} />,
      label: t('records'),
    },
  ];

  const textColor = isDarkMode ? '#F8FAFC' : '#1E293B';
  const subTextColor = isDarkMode ? '#94A3B8' : '#64748B';

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 240 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="ant-layout-sider"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          // background is handled by CSS class .ant-layout-sider
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          // borderRight is handled by CSS
          boxShadow: isDarkMode ? '4px 0 24px rgba(0, 0, 0, 0.2)' : '4px 0 24px rgba(0, 106, 254, 0.04)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 106, 254, 0.05)',
          flexShrink: 0
        }}>
          <AnimatePresence mode="wait">
            {collapsed ? (
              <motion.div
                key="mini-logo"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                style={{
                  width: 36,
                  height: 36,
                  background: 'var(--brand-gradient)',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0, 106, 254, 0.2)'
                }}>
                <Activity size={20} color="white" />
              </motion.div>
            ) : (
              <motion.div
                key="full-logo"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <div style={{
                  width: 28,
                  height: 28,
                  background: 'var(--brand-gradient)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Activity size={16} color="white" />
                </div>
                <span style={{ fontWeight: 700, fontSize: 18, color: textColor, letterSpacing: '-0.02em' }}>Spinodyne</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <LayoutGroup id="sidebar-menu">
          <nav style={{ flex: 1, padding: '16px 12px' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {menuItems.map((item) => {
                const isActive = location.pathname.startsWith(item.key);
                return (
                  <li key={item.key} style={{ position: 'relative', marginBottom: 8 }}>
                    <motion.div
                      onClick={() => navigate(item.key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        color: isActive ? '#006AFE' : subTextColor,
                        transition: 'color 0.3s ease',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        gap: collapsed ? 0 : 12,
                        zIndex: 2,
                        position: 'relative'
                      }}
                      whileHover={{ color: isActive ? '#006AFE' : textColor }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24 }}>
                        {item.icon}
                      </div>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          style={{ fontWeight: isActive ? 600 : 500, whiteSpace: 'nowrap' }}
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </motion.div>

                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: isDarkMode ? 'rgba(0, 106, 254, 0.15)' : 'rgba(0, 106, 254, 0.08)',
                          borderRadius: '12px',
                          border: isDarkMode ? '1px solid rgba(0, 106, 254, 0.2)' : '1px solid rgba(0, 106, 254, 0.1)',
                          zIndex: 1
                        }}
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                  </li>
                );
              })}

            </ul>
          </nav>
        </LayoutGroup>

        <div style={{ padding: '20px 12px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 106, 254, 0.05)' }}>
          {!collapsed && (
            <div style={{ display: 'flex', gap: 8 }}>
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>
          )}
          <Button
            type="text"
            icon={collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: subTextColor }}
          />
        </div>
      </motion.aside>

      <motion.div
        animate={{ marginLeft: collapsed ? 80 : 240 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ flex: 1, minHeight: '100vh', background: 'transparent' }}
      >
        <Content style={{
          padding: '32px',
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 1600,
          width: '100%',
          alignSelf: 'center'
        }}>
          <div style={{ flex: 1, width: '100%' }}>
            {children}
          </div>

          <div style={{
            marginTop: 48,
            textAlign: 'center',
            paddingTop: 24,
            borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ color: subTextColor, fontSize: 13, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 8px' }}>
              <span>Copyright © {new Date().getFullYear()} <a href="https://github.com/Albertzry" target="_blank" rel="noopener noreferrer" style={{ color: subTextColor, textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#006AFE'} onMouseOut={(e) => e.currentTarget.style.color = subTextColor}>Albertzry</a>.</span>
              <span>Licensed under <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener noreferrer" style={{ color: subTextColor, textDecoration: 'underline', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#006AFE'} onMouseOut={(e) => e.currentTarget.style.color = subTextColor}>CC BY-NC 4.0</a>.</span>
            </div>
          </div>
        </Content>
      </motion.div>
    </Layout>
  );
};

export default MainLayout;
