import React, { useEffect, useState } from 'react';
import { Tabs, Table, Tag, Typography, Image, Empty, Spin, message, Card, Statistic, Segmented, Row, Col, Space } from 'antd';
import { FileBarChart, Ruler, Activity, Brain, TrendingUp, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

const { Text, Title, Paragraph } = Typography;

interface ResultPanelProps {
  taskUid: string | null;
}

// 定义数据接口
interface FullResultData {
  task_info: {
    task_uid: string;
    status: string;
  };
  files_3d: {
    base_url: string;
    structure_mask_url: string;
    ldh_mask_url: string;
  };
  report_metadata: {
    global_angles: {
      lumbar_lordosis_LL_deg?: number;
      sacral_slope_SS_deg?: number;
      lumbosacral_angle_LSA_deg?: number;
    };
    notes: string;
  };
  structured_results: {
    geometry: {
      data: {
        vertebral_height?: Record<string, any>;
        vertebral_ap_diameter?: Record<string, any>;
        disc_metrics?: Record<string, any>;
      };
      images: {
        vertebral_height?: Record<string, string>;
        vertebral_ap_diameter?: Record<string, string>;
        disc_metrics?: Record<string, string>;
      };
    };
    angles: {
      data: {
        disc_inclination_angle_DIA?: Record<string, any>;
      };
      images: {
        disc_inclination?: Record<string, string>;
      };
    };
    herniation: {
      data: Record<string, any>;
      images: Record<string, any>;
    };
  };
}

const ResultPanel: React.FC<ResultPanelProps> = ({ taskUid }) => {
  const [loading, setLoading] = useState(false);
  const [fullResultData, setFullResultData] = useState<FullResultData | null>(null);
  
  // Geometry Tab 的状态
  const [geometryView, setGeometryView] = useState<string>('vertebral_height');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  
  // Angles Tab 的状态
  const [selectedDiscLevel, setSelectedDiscLevel] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!taskUid) return;

      setLoading(true);
      try {
        const resultRes = await api.get<FullResultData>(`/result/full/${taskUid}`);
        setFullResultData(resultRes.data);
      } catch (error) {
        console.error('Failed to load result data:', error);
        message.error('加载分析结果失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [taskUid]);

  // Auto-selection logic
  useEffect(() => {
    if (fullResultData?.structured_results?.geometry?.data) {
      const geometryData = fullResultData.structured_results.geometry.data || {};
      const data = geometryData[geometryView as keyof typeof geometryData] || {};
      const tableData = Object.entries(data)
        .filter(([_, val]: any) => val && val.status === 'ok')
        .map(([level]) => level);
      
      if (tableData.length > 0 && !selectedLevel) {
        setSelectedLevel(tableData[0]);
      }
    }
  }, [geometryView, fullResultData, selectedLevel]);

  useEffect(() => {
    if (fullResultData?.structured_results?.angles?.data?.disc_inclination_angle_DIA) {
      const anglesData = fullResultData.structured_results.angles.data.disc_inclination_angle_DIA || {};
      const tableData = Object.entries(anglesData)
        .filter(([_, val]: any) => val && val.status === 'ok')
        .map(([level]) => level);
      
      if (tableData.length > 0 && !selectedDiscLevel) {
        setSelectedDiscLevel(tableData[0]);
      }
    }
  }, [fullResultData, selectedDiscLevel]);

  if (!taskUid) return <Empty description="未选择任务" className="mt-20" />;
  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Spin tip="加载分析结果中..." size="large" />
    </div>
  );
  if (!fullResultData) return <Empty description="无分析数据" className="mt-20" />;

  const { report_metadata, structured_results } = fullResultData;
  const globalAngles = report_metadata?.global_angles || {};

  const renderGlobalSummary = () => (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Row gutter={[12, 12]} className="mb-4">
        {[
          { title: '腰椎前凸角 (LL)', value: globalAngles.lumbar_lordosis_LL_deg, color: '#1890ff' },
          { title: '骶骨倾斜角 (SS)', value: globalAngles.sacral_slope_SS_deg, color: '#52c41a' },
          { title: '腰骶角 (LSA)', value: globalAngles.lumbosacral_angle_LSA_deg, color: '#faad14' }
        ].map((item, idx) => (
          <Col xs={12} sm={8} key={idx}>
            <Card size="small" className="text-center shadow-sm hover:shadow-md transition-shadow" bodyStyle={{ padding: '8px 4px' }}>
              <Statistic
                title={<span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{item.title}</span>}
                value={item.value?.toFixed(1) || 'N/A'}
                suffix="°"
                valueStyle={{ color: item.color, fontSize: '18px', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </motion.div>
  );

  const renderGeometryTab = () => {
    const geometryData = structured_results?.geometry?.data || {};
    const geometryImages = structured_results?.geometry?.images || {};

    const getTableData = (subcategory: string) => {
      const data = geometryData[subcategory as keyof typeof geometryData] || {};
      return Object.entries(data)
        .filter(([_, val]: any) => val && val.status === 'ok')
        .map(([level, val]: any) => ({
          key: level,
          level,
          ...val,
        }));
    };

    const currentTableData = getTableData(geometryView);
    const currentImages = geometryImages[geometryView as keyof typeof geometryImages] || {};

    const getColumns = () => {
      if (geometryView === 'vertebral_height') {
        return [
          { title: '层级', dataIndex: 'level', key: 'level', width: 60, render: (t: string) => <Tag color="blue" className="m-0 text-[10px]">{t}</Tag> },
          { title: '前缘(mm)', dataIndex: 'anterior_mm', key: 'anterior_mm', render: (v: number) => v?.toFixed(1) },
          { title: '后缘(mm)', dataIndex: 'posterior_mm', key: 'posterior_mm', render: (v: number) => v?.toFixed(1) },
        ];
      } else if (geometryView === 'vertebral_ap_diameter') {
        return [
          { title: '层级', dataIndex: 'level', key: 'level', width: 60, render: (t: string) => <Tag color="purple" className="m-0 text-[10px]">{t}</Tag> },
          { title: '前后径(mm)', dataIndex: 'ap_diameter_mm', key: 'ap_diameter_mm', render: (v: number) => v?.toFixed(1) },
        ];
      } else if (geometryView === 'disc_metrics') {
        return [
          { title: '层级', dataIndex: 'level', key: 'level', width: 60, render: (t: string) => <Tag color="cyan" className="m-0 text-[10px]">{t}</Tag> },
          { title: 'DH', dataIndex: 'dh_mm', key: 'dh_mm', render: (v: number) => v?.toFixed(1) },
          { title: 'DHI', dataIndex: 'dhi', key: 'dhi', render: (v: number) => v?.toFixed(2) },
        ];
      }
      return [];
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Segmented
            value={geometryView}
            onChange={(v) => { setGeometryView(v as string); setSelectedLevel(null); }}
            options={[
              { label: '高度', value: 'vertebral_height' },
              { label: '前后径', value: 'vertebral_ap_diameter' },
              { label: '椎间盘', value: 'disc_metrics' },
            ]}
            size="small"
            className="bg-slate-100 p-0.5 rounded-lg"
          />
        </div>

        <Row gutter={[12, 12]}>
          <Col span={24} lg={11}>
            <Table
              dataSource={currentTableData}
              columns={getColumns()}
              pagination={false}
              size="small"
              rowKey="level"
              scroll={{ y: 240 }}
              onRow={(record) => ({
                onClick: () => setSelectedLevel(record.level),
                className: selectedLevel === record.level ? 'bg-blue-50 cursor-pointer' : 'cursor-pointer hover:bg-slate-50',
              })}
              className="border border-slate-100 rounded-lg overflow-hidden"
            />
          </Col>
          <Col span={24} lg={13}>
            <Card size="small" className="h-full flex items-center justify-center bg-slate-50 border-none" bodyStyle={{ padding: 4 }}>
              <AnimatePresence mode="wait">
                {selectedLevel && currentImages[selectedLevel] ? (
                  <motion.div key={selectedLevel} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                    <Image src={currentImages[selectedLevel]} className="max-h-[240px] w-auto rounded shadow-sm" />
                  </motion.div>
                ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="选择层级查看图像" />}
              </AnimatePresence>
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  const renderAnglesTab = () => {
    const anglesData = structured_results?.angles?.data?.disc_inclination_angle_DIA || {};
    const anglesImages = structured_results?.angles?.images?.disc_inclination || {};

    const tableData = Object.entries(anglesData)
      .filter(([_, val]: any) => val && val.status === 'ok')
      .map(([level, val]: any) => ({ key: level, level, dia_deg: val.dia_deg }));

    return (
      <Row gutter={[12, 12]}>
        <Col span={24} lg={10}>
          <Table
            dataSource={tableData}
            columns={[
              { title: '层级', dataIndex: 'level', key: 'level', render: (t: string) => <Tag color="orange" className="m-0 text-[10px]">{t}</Tag> },
              { title: '倾斜角(°)', dataIndex: 'dia_deg', key: 'dia_deg', render: (v: number) => v?.toFixed(1) },
            ]}
            pagination={false}
            size="small"
            scroll={{ y: 240 }}
            onRow={(record) => ({
              onClick: () => setSelectedDiscLevel(record.level),
              className: selectedDiscLevel === record.level ? 'bg-orange-50 cursor-pointer' : 'cursor-pointer hover:bg-slate-50',
            })}
            className="border border-slate-100 rounded-lg overflow-hidden"
          />
        </Col>
        <Col span={24} lg={14}>
          <Card size="small" className="h-full flex items-center justify-center bg-slate-50 border-none" bodyStyle={{ padding: 4 }}>
            <AnimatePresence mode="wait">
              {selectedDiscLevel && anglesImages[selectedDiscLevel] ? (
                <motion.div key={selectedDiscLevel} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                  <Image src={anglesImages[selectedDiscLevel]} className="max-h-[240px] w-auto rounded shadow-sm" />
                </motion.div>
              ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </AnimatePresence>
          </Card>
        </Col>
      </Row>
    );
  };

  const renderHerniationTab = () => {
    const herniationData = structured_results?.herniation?.data || {};
    const herniationImages = structured_results?.herniation?.images || {};

    const tableData = Object.entries(herniationData)
      .filter(([_, val]: any) => val && typeof val === 'object')
      .map(([level, val]: any) => ({ key: level, level, pd: val.PD, pa: val.PA, par: val.PAR, plr: val.PLR }));

    const mainImageUrl = herniationImages?.general?.ldh_PD_PA_PAR_PLR || 
                         (herniationImages?.general ? Object.values(herniationImages.general)[0] : '') as string || '';

    return (
      <div className="space-y-4">
        <Card size="small" className="bg-red-50/50 border-red-100" bodyStyle={{ padding: '8px 12px' }}>
          <Space align="start" size={8}>
            <Activity size={14} className="text-red-500 mt-1" />
            <Text className="text-[11px] text-slate-600 leading-relaxed">
              {report_metadata?.notes || '系统已自动检测椎间盘形态和信号强度，详细指标请参考下方数据。'}
            </Text>
          </Space>
        </Card>

        <div className="flex justify-center bg-slate-50 rounded-lg p-2 border border-slate-100">
          {mainImageUrl ? <Image src={mainImageUrl} className="max-h-[300px] w-auto rounded" /> : <Empty description="无分析图像" />}
        </div>

        <Table
          dataSource={tableData}
          columns={[
            { title: '层级', dataIndex: 'level', key: 'level', width: 60, render: (t: string) => <Tag color="red" className="m-0 text-[10px]">{t}</Tag> },
            { title: 'PD', dataIndex: 'pd', key: 'pd', render: (v: number) => v?.toFixed(2) },
            { title: 'PA', dataIndex: 'pa', key: 'pa', render: (v: number) => v?.toFixed(2) },
            { title: 'PAR', dataIndex: 'par', key: 'par', render: (v: number) => v?.toFixed(2) },
            { title: 'PLR', dataIndex: 'plr', key: 'plr', render: (v: number) => v?.toFixed(2) },
          ]}
          pagination={false}
          size="small"
          className="border border-slate-100 rounded-lg overflow-hidden"
        />
      </div>
    );
  };

  const tabItems = [
    { key: 'herniation', label: <Space size={4}><Activity size={12}/>突出</Space>, children: renderHerniationTab() },
    { key: 'geometry', label: <Space size={4}><Ruler size={12}/>形态</Space>, children: renderGeometryTab() },
    { key: 'angles', label: <Space size={4}><TrendingUp size={12}/>角度</Space>, children: renderAnglesTab() },
  ];

  return (
    <div className="bg-white rounded-xl h-full flex flex-col border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div>
          <Title level={5} className="!mb-0 text-slate-800">分析仪表板</Title>
          <Text className="text-[10px] text-slate-400 font-mono">ID: {taskUid?.substring(0, 8)}</Text>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {renderGlobalSummary()}
        <Tabs 
          defaultActiveKey="herniation" 
          items={tabItems} 
          size="small"
          type="card"
          className="clinical-tabs-compact"
        />
      </div>
    </div>
  );
};

export default ResultPanel;
