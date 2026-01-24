import React, { useEffect, useState } from 'react';
import { Tabs, Table, Tag, Typography, Image, Empty, Spin, message } from 'antd';
import { FileBarChart, Ruler, Activity, Brain } from 'lucide-react';
import { get } from 'lodash';
import api from '../../services/api';

const { Text, Title, Paragraph } = Typography;

interface ResultPanelProps {
  taskUid: string | null;
}

const ResultPanel: React.FC<ResultPanelProps> = ({ taskUid }) => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const getImageUrl = (category: string, subcategory?: string, itemId?: string) => {
    if (!taskUid) return '';
    const params = new URLSearchParams();
    params.append('category', category);
    if (subcategory) params.append('subcategory', subcategory);
    if (itemId) params.append('item_id', itemId);
    // Use the same /api prefix as other requests
    return `/api/result/image/${taskUid}?${params.toString()}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!taskUid) return;

      setLoading(true);
      try {
        // Fetch report data only
        const reportRes = await api.get(`/result/report/${taskUid}`);
        setReportData(reportRes.data);
      } catch (error) {
        console.error('Failed to load result data:', error);
        message.error('Failed to load analysis results');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [taskUid]);

  if (!taskUid) return <Empty description="No task selected" className="mt-20" />;
  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Spin tip="Loading analysis results..." />
    </div>
  );
  if (!reportData) return <Empty description="No analysis data available" className="mt-20" />;

  // Helper to get nested report data safely
  const report = reportData || {};

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
          <Title level={5}>Herniation Analysis Map</Title>
          <div className="flex justify-center border border-slate-200 rounded-lg p-4 bg-slate-50">
             <Image 
               src={getImageUrl('herniation')} 
               alt="Herniation Analysis"
               className="object-contain max-h-[400px]"
             />
          </div>
        </div>
      </div>
    );
  };

  // --- Tab 2: Geometry & Angles ---
  const renderGeometry = () => {
    const vertebral_metrics = get(report, 'geometry.vertebral_height', {});
    const disc_metrics = get(report, 'geometry.disc_metrics', {});
    const angles = get(report, 'angles', {});

    // Convert objects to arrays for Table
    const v_data = Object.entries(vertebral_metrics)
      .filter(([_, val]: any) => val.status === 'ok')
      .map(([level, val]: any) => ({
        level,
        height: `${val.anterior_mm?.toFixed(1)} / ${val.posterior_mm?.toFixed(1)}`,
        width: '-' // AP diameter is in another object, keep it simple for now
      }));

    const d_data = Object.entries(disc_metrics)
      .filter(([_, val]: any) => val.status === 'ok')
      .map(([level, val]: any) => ({
        level,
        height: val.dh_mm?.toFixed(1),
        angle: get(report, `angles.disc_inclination_angle_DIA.${level}.dia_deg`, 0)?.toFixed(1)
      }));

    const v_columns = [
      { title: 'Level', dataIndex: 'level', key: 'level', render: (t: string) => <Tag color="blue">{t}</Tag> },
      { title: 'H (Ant/Post)', dataIndex: 'height', key: 'height' },
      { 
        title: 'Visuals', 
        key: 'visuals',
        render: (_: any, record: any) => (
          <div className="flex gap-2">
            <Image 
               src={getImageUrl('geometry', 'vertebral_height', record.level)}
               width={30}
               height={30}
               className="rounded object-cover border border-slate-200 cursor-pointer hover:opacity-80"
               preview={{ src: getImageUrl('geometry', 'vertebral_height', record.level) }}
               alt="Height"
            />
          </div>
        )
      },
    ];

    const d_columns = [
        { title: 'Level', dataIndex: 'level', key: 'level', render: (t: string) => <Tag color="cyan">{t}</Tag> },
        { title: 'H (mm)', dataIndex: 'height', key: 'height' },
        { title: 'Angle (°)', dataIndex: 'angle', key: 'angle' },
        { 
            title: 'Visuals', 
            key: 'visuals',
            render: (_: any, record: any) => (
              <div className="flex gap-2">
                <Image 
                   src={getImageUrl('geometry', 'disc_metrics', record.level)}
                   width={30}
                   height={30}
                   className="rounded object-cover border border-slate-200 cursor-pointer hover:opacity-80"
                   preview={{ src: getImageUrl('geometry', 'disc_metrics', record.level) }}
                   alt="Metrics"
                />
                <Image 
                   src={getImageUrl('angles', 'disc_inclination', record.level)}
                   width={30}
                   height={30}
                   className="rounded object-cover border border-slate-200 cursor-pointer hover:opacity-80"
                   preview={{ src: getImageUrl('angles', 'disc_inclination', record.level) }}
                   alt="Angle"
                />
              </div>
            )
        },
    ];

    return (
      <div className="space-y-8">
        {/* Cobb Angles Summary */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
             <Title level={5} className="flex items-center gap-2 mb-4">
                <Ruler size={16} /> Global Spinal Parameters
             </Title>
             <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                    <Text type="secondary" className="block text-xs mb-1">Lumbar Lordosis (LL)</Text>
                    <div className="font-semibold text-lg mb-2">{angles.lumbar_lordosis_LL_deg?.toFixed(1)}°</div>
                    <Image src={getImageUrl('angles', 'cobb', 'LL')} height={100} className="object-contain rounded border border-slate-200 bg-white" />
                </div>
                <div className="text-center">
                    <Text type="secondary" className="block text-xs mb-1">Sacral Slope (SS)</Text>
                    <div className="font-semibold text-lg mb-2">{angles.sacral_slope_SS_deg?.toFixed(1)}°</div>
                    <Image src={getImageUrl('angles', 'cobb', 'SS')} height={100} className="object-contain rounded border border-slate-200 bg-white" />
                </div>
                <div className="text-center">
                    <Text type="secondary" className="block text-xs mb-1">Lumbosacral Angle (LSA)</Text>
                    <div className="font-semibold text-lg mb-2">{angles.lumbosacral_angle_LSA_deg?.toFixed(1)}°</div>
                    <Image src={getImageUrl('angles', 'cobb', 'LSA')} height={100} className="object-contain rounded border border-slate-200 bg-white" />
                </div>
             </div>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
                <Text strong className="block mb-2">Vertebral Metrics</Text>
                {v_data.length > 0 ? (
                    <Table dataSource={v_data} columns={v_columns} pagination={false} size="small" rowKey="level" />
                ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </div>
            <div>
                <Text strong className="block mb-2">Disc Metrics</Text>
                {d_data.length > 0 ? (
                    <Table dataSource={d_data} columns={d_columns} pagination={false} size="small" rowKey="level" />
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
         <Image 
            src={getImageUrl('intensity')} 
            alt="Intensity Analysis"
            width="100%" 
            style={{ maxWidth: '500px'}} 
         />
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
           ID: <span className="font-mono">{taskUid?.substring(0, 8)}...</span>
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
