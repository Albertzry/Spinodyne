import React from 'react';
import { Tabs, Table, Tag, Alert, Typography } from 'antd';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const { Text, Title } = Typography;

interface ResultPanelProps {
  data: any;
}

const ResultPanel: React.FC<ResultPanelProps> = ({ data }) => {
  if (!data) return null;

  // Tab 1: Pathology findings
  const renderPathology = () => (
    <div className="space-y-4">
      {data.findings.map((finding: any, idx: number) => (
        <Alert
          key={idx}
          message={finding.title}
          description={finding.description}
          type={finding.severity === 'high' ? 'error' : 'warning'}
          showIcon
          className="border-none shadow-sm rounded-lg"
        />
      ))}
      <div className="mt-4 flex gap-2 flex-wrap">
        <Tag color="blue">Cervical Spine</Tag>
        <Tag color="cyan">Segmentation: Complete</Tag>
        <Tag color="purple">Model: TotalSpineSeg v1.2</Tag>
      </div>
    </div>
  );

  // Tab 2: Intensity Histogram
  const renderIntensity = () => (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.histogram}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="intensity" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="text-center mt-2">
        <Text className="text-slate-400 text-xs italic">Voxel Intensity Distribution (HU)</Text>
      </div>
    </div>
  );

  // Tab 3: Angles
  const renderAngles = () => {
    const columns = [
      { title: 'Parameter', dataKey: 'name', key: 'name', render: (t: string) => <Text strong>{t}</Text> },
      { title: 'Value', dataKey: 'value', key: 'value' },
      { title: 'Normal Range', dataKey: 'range', key: 'range', render: (t: string) => <Text type="secondary">{t}</Text> },
    ];
    return (
      <Table 
        dataSource={data.angles} 
        columns={columns} 
        pagination={false} 
        size="small"
        className="clinical-table"
      />
    );
  };

  // Tab 4: Geometry
  const renderGeometry = () => {
    const columns = [
      { title: 'Structure', dataKey: 'name', key: 'name', render: (t: string) => <Text strong>{t}</Text> },
      { title: 'Height (mm)', dataKey: 'height', key: 'height' },
      { title: 'Diameter (mm)', dataKey: 'diameter', key: 'diameter' },
    ];
    return (
      <Table 
        dataSource={data.geometry} 
        columns={columns} 
        pagination={false} 
        size="small"
        className="clinical-table"
      />
    );
  };

  const items = [
    { key: '1', label: 'Pathology', children: renderPathology() },
    { key: '2', label: 'Intensity', children: renderIntensity() },
    { key: '3', label: 'Angles', children: renderAngles() },
    { key: '4', label: 'Geometry', children: renderGeometry() },
  ];

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 h-full overflow-auto">
      <Title level={4} className="mb-6 clinical-heading">Analysis Results</Title>
      <Tabs 
        defaultActiveKey="1" 
        items={items} 
        className="clinical-tabs"
      />
    </div>
  );
};

export default ResultPanel;
