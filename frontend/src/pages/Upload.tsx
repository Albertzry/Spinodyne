import React from 'react';
import { Typography } from 'antd';
import PageTransition from '../components/PageTransition';

const { Title, Paragraph } = Typography;

const Upload: React.FC = () => {
  return (
    <PageTransition>
      <div className="glass-panel" style={{ padding: 40, borderRadius: 16, height: '100%' }}>
        <Title level={2} style={{ marginTop: 0 }}>Upload Data</Title>
        <Paragraph>
          Upload patient data for analysis. Supported formats: .csv, .json.
        </Paragraph>
        {/* Placeholder for Upload UI */}
        <div style={{ 
            border: '2px dashed rgba(15, 23, 42, 0.2)', 
            borderRadius: 12, 
            height: 300, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.3)'
        }}>
            <span style={{ color: '#64748b' }}>Drag & Drop files here</span>
        </div>
      </div>
    </PageTransition>
  );
};

export default Upload;
