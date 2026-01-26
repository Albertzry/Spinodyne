import React, { useState } from 'react';
import { Layout, Menu, Button } from 'antd';
import { Upload as UploadIcon, FileText, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const { Sider, Content } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        width={240}
        collapsedWidth={80}
        className="ant-layout-sider" // Handled by global CSS for Glassmorphism
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderBottom: '1px solid rgba(0, 106, 254, 0.05)'
        }}>
          {collapsed ? (
            <div style={{ 
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
            </div>
          ) : (
             <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                <span style={{ fontWeight: 700, fontSize: 18, color: '#1E293B', letterSpacing: '-0.02em' }}>Spinodyne</span>
             </div>
          )}
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          style={{ borderRight: 0, background: 'transparent', marginTop: 16 }}
          items={[
            {
              key: '/inference',
              icon: <UploadIcon size={20} />,
              label: 'Inference',
              onClick: () => navigate('/inference'),
            },
            {
              key: '/records',
              icon: <FileText size={20} />,
              label: 'Records',
              onClick: () => navigate('/records'),
            },
          ]}
        />
        
        <div style={{ position: 'absolute', bottom: 20, width: '100%', display: 'flex', justifyContent: 'center' }}>
            <Button 
                type="text" 
                icon={collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />} 
                onClick={() => setCollapsed(!collapsed)}
                style={{ color: '#94A3B8' }}
            />
        </div>
      </Sider>
      
      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', background: 'transparent' }}>
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
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
