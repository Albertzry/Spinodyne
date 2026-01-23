import React from 'react';
import { Tabs, Table, Tag, Typography, Image, Empty, Descriptions } from 'antd';
import { FileBarChart, Ruler, Activity, Brain } from 'lucide-react';
import { get } from 'lodash';

const { Text, Title, Paragraph } = Typography;

interface ResultPanelProps {
  data: any; // The full result object from backend
}

const ResultPanel: React.FC<ResultPanelProps> = ({ data }) => {
  if (!data) return <Empty description="No analysis data available" className="mt-20" />;

  const { analysis_images, report_data } = data;

  // Helper to get nested report data safely
  const report = report_data || {};

  // --- Tab 1: Pathology (Herniation) ---
  const renderPathology = () => {
    // Extract herniation findings if available in JSON
    const findings = get(report, 'findings', []); 
    
    return (
      <div className="space-y-6">
        <div className="bg-red-50 p-4 rounded-lg border border-red-100">
          <div className="flex items-center gap-2 mb-2 text-red-700 font-semibold">
            <Activity size={18} />
            <span>Pathology Summary</span>
          </div>
          {findings.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
              {findings.map((f: any, idx: number) => (
                <li key={idx}>{f}</li>
              ))}
            </ul>
          ) : (
            <Text type="secondary" className="text-sm">No critical findings detected automatically.</Text>
          )}
        </div>

        <div>
          <Title level={5}>Herniation Analysis Maps</Title>
          <div className="grid grid-cols-1 gap-4">
            <Image.PreviewGroup>
              {analysis_images?.herniation?.map((src: string, idx: number) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-2 bg-slate-50">
                  <Image 
                    src={src} 
                    alt={`Herniation Map ${idx}`}
                    className="object-contain max-h-[300px] w-full"
                  />
                  <Text type="secondary" className="text-xs text-center block mt-2">Segmentation & Heatmap</Text>
                </div>
              ))}
            </Image.PreviewGroup>
            {(!analysis_images?.herniation || analysis_images.herniation.length === 0) && (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No images generated" />
            )}
          </div>
        </div>
      </div>
    );
  };

  // --- Tab 2: Geometry & Angles ---
  const renderGeometry = () => {
    // Convert report data to table source
    // Assuming report structure: { metrics: { l4: { height: ... }, ... } }
    // This is a generic adapter, adjust key access based on actual JSON
    
    const vertebral_metrics = get(report, 'vertebrae', []);
    const disc_metrics = get(report, 'discs', []);

    const v_columns = [
      { title: 'Level', dataIndex: 'level', key: 'level', render: (t: string) => <Tag color="blue">{t}</Tag> },
      { title: 'Height (mm)', dataIndex: 'height', key: 'height' },
      { title: 'Width (mm)', dataIndex: 'width', key: 'width' },
    ];

    const d_columns = [
        { title: 'Level', dataIndex: 'level', key: 'level', render: (t: string) => <Tag color="cyan">{t}</Tag> },
        { title: 'Height (mm)', dataIndex: 'height', key: 'height' },
        { title: 'Angle (°)', dataIndex: 'angle', key: 'angle' },
    ];

    return (
      <div className="space-y-8">
        {/* Images */}
        <div>
           <Title level={5} className="flex items-center gap-2">
             <Ruler size={16} /> Measurement Visualizations
           </Title>
           <div className="grid grid-cols-2 gap-4">
             <Image.PreviewGroup>
                {[...(analysis_images?.geometry || []), ...(analysis_images?.angles || [])].map((src: string, idx: number) => (
                  <div key={idx} className="border border-slate-200 rounded-lg p-1">
                    <Image src={src} className="rounded" />
                  </div>
                ))}
             </Image.PreviewGroup>
           </div>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
                <Text strong className="block mb-2">Vertebral Metrics</Text>
                {vertebral_metrics.length > 0 ? (
                    <Table dataSource={vertebral_metrics} columns={v_columns} pagination={false} size="small" rowKey="level" />
                ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </div>
            <div>
                <Text strong className="block mb-2">Disc Metrics</Text>
                {disc_metrics.length > 0 ? (
                    <Table dataSource={disc_metrics} columns={d_columns} pagination={false} size="small" rowKey="level" />
                ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </div>
        </div>
      </div>
    );
  };

  // --- Tab 3: Intensity ---
  const renderIntensity = () => (
    <div className="space-y-4">
      <div className="bg-slate-50 p-4 rounded-lg">
        <Title level={5}>Voxel Intensity Analysis</Title>
        <Paragraph className="text-sm text-slate-500">
           Distribution of signal intensities across segmented spinal structures. 
           Abnormal intensity may indicate degeneration or pathology.
        </Paragraph>
      </div>
      
      <div className="flex justify-center border border-slate-200 rounded-xl p-4">
         <Image.PreviewGroup>
            {analysis_images?.intensity?.map((src: string, idx: number) => (
               <Image key={idx} src={src} width="100%" style={{ maxWidth: '400px'}} />
            ))}
         </Image.PreviewGroup>
      </div>
    </div>
  );

  const items = [
    { 
        key: '1', 
        label: <span className="flex items-center gap-2"><Brain size={14}/> Pathology</span>, 
        children: renderPathology() 
    },
    { 
        key: '2', 
        label: <span className="flex items-center gap-2"><Ruler size={14}/> Geometry</span>, 
        children: renderGeometry() 
    },
    { 
        key: '3', 
        label: <span className="flex items-center gap-2"><FileBarChart size={14}/> Intensity</span>, 
        children: renderIntensity() 
    },
  ];

  return (
    <div className="bg-white rounded-xl p-0 h-full flex flex-col border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <Title level={4} className="clinical-heading !mb-0">Analysis Report</Title>
        <Text type="secondary" className="text-xs">
           ID: <span className="font-mono">{data.uid?.substring(0, 8)}...</span>
        </Text>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <Tabs 
          defaultActiveKey="1" 
          items={items} 
          className="clinical-tabs"
          type="card"
        />
      </div>
    </div>
  );
};

export default ResultPanel;
