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
        style={{
          borderRight: '1px solid rgba(0,0,0,0.05)',
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
        width={240}
        collapsedWidth={80}
      >
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderBottom: '1px solid rgba(0,0,0,0.05)'
        }}>
          {collapsed ? (
            <div style={{ 
                width: 32, 
                height: 32, 
                background: '#0f172a', 
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Activity size={18} color="white" />
            </div>
          ) : (
             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                 <div style={{ 
                    width: 24, 
                    height: 24, 
                    background: '#0f172a', 
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Activity size={14} color="white" />
                </div>
                <span style={{ fontWeight: 600, fontSize: 18, color: '#0f172a' }}>Spinodyne</span>
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
        
        <div style={{ position: 'absolute', bottom: 16, width: '100%', display: 'flex', justifyContent: 'center' }}>
            <Button 
                type="text" 
                icon={collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />} 
                onClick={() => setCollapsed(!collapsed)}
                style={{ color: '#64748b' }}
            />
        </div>
      </Sider>
      
      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'all 0.2s', background: 'transparent' }}>
        <Content style={{ 
            padding: '24px', 
            margin: 0, 
            minHeight: 280, 
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 1920, // 2k/4k optimization cap
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
