import React, { useState } from 'react';
import { Layout, Menu, Avatar, Typography } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutGrid,
  Activity,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Menu items configuration
  const menuItems = [
    {
      key: '/dashboard',
      icon: <LayoutGrid size={20} />,
      label: 'Dashboard',
    },
    {
      key: '/inference',
      icon: <Activity size={20} />,
      label: 'AI Inference',
    },
    {
      key: '/patients',
      icon: <Users size={20} />,
      label: 'Patients',
    },
    {
      key: '/settings',
      icon: <Settings size={20} />,
      label: 'Settings',
    },
  ];

  // Get current page title
  const getCurrentTitle = () => {
    const currentItem = menuItems.find(item => item.key === location.pathname);
    return currentItem?.label || 'Spinodyne';
  };

  const handleMenuClick = (e: { key: string }) => {
    navigate(e.key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={240}
        style={{
          background: '#fff',
          borderRight: '1px solid #e2e8f0',
        }}
        trigger={null}
      >
        {/* Logo Area */}
        <div
          style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: collapsed ? '0 24px' : '0 24px',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          {!collapsed && (
            <Title
              level={4}
              style={{
                margin: 0,
                color: '#0ea5e9',
                fontWeight: 700,
                letterSpacing: '-0.5px',
              }}
            >
              Spinodyne
            </Title>
          )}
          {collapsed && (
            <Title
              level={4}
              style={{
                margin: 0,
                color: '#0ea5e9',
                fontWeight: 700,
              }}
            >
              S
            </Title>
          )}
        </div>

        {/* Collapse Toggle */}
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            borderBottom: '1px solid #e2e8f0',
            color: '#64748b',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f8fafc';
            e.currentTarget.style.color = '#0ea5e9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </div>

        {/* Navigation Menu */}
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={handleMenuClick}
          items={menuItems}
          style={{
            border: 'none',
            marginTop: '16px',
          }}
        />
      </Sider>

      <Layout>
        {/* Header */}
        <Header
          style={{
            background: '#fff',
            padding: '0 32px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '64px',
          }}
        >
          <Title
            level={5}
            style={{
              margin: 0,
              color: '#1e293b',
              fontWeight: 600,
            }}
          >
            {getCurrentTitle()}
          </Title>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: '#64748b', fontSize: '14px' }}>
              Dr. Admin
            </span>
            <Avatar
              size={36}
              style={{
                backgroundColor: '#0ea5e9',
                cursor: 'pointer',
              }}
            >
              A
            </Avatar>
          </div>
        </Header>

        {/* Content Area with Animation */}
        <Content
          style={{
            margin: '24px',
            padding: '24px',
            background: '#f8fafc',
            minHeight: 280,
            overflow: 'auto',
          }}
        >
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
