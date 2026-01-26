import React from 'react';
import { Tabs, Card, List, Typography, Row, Col, Image, Tooltip, Empty, Statistic, Space, Divider } from 'antd';
import { AlignVerticalJustifyCenter, Ruler, Activity, Info } from 'lucide-react';

const { Text, Title } = Typography;

// --- Interfaces matching the Refactored Backend Response ---

export interface VertebraResult {
  level: string;
  vh_anterior: number;
  vh_posterior: number;
  ap_diameter: number;
  status: string;
  preview_url_vh?: string;
  preview_url_ap?: string;
}

export interface DiscResult {
  level: string;
  dh: number;
  dhi: number;
  hdr: number;
  dia: number;
  status: string;
  scan_height_a?: number;
  scan_height_m?: number;
  scan_height_p?: number;
  preview_url_dm?: string;
  preview_url_dia?: string;
}

export interface GlobalMetric {
  ll: number;
  ss: number;
  lsa: number;
  pd?: number;
  pa?: number;
  par?: number;
  plr?: number;
  preview_url_ll?: string;
  preview_url_ss?: string;
  preview_url_lsa?: string;
  preview_url_herniation?: string;
}

interface DataPanelProps {
  vertebrae: VertebraResult[];
  discs: DiscResult[];
  globalMetrics: GlobalMetric | null;
}

// --- Helper Components ---

const MetricLabel = ({ label, tooltip }: { label: string; tooltip?: string }) => (
  <Space size={4} style={{ display: 'flex' }}>
    <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{label}</Text>
    {tooltip && (
      <Tooltip title={tooltip}>
        <Info size={10} style={{ color: '#94a3b8', cursor: 'help' }} />
      </Tooltip>
    )}
  </Space>
);

const MetricValue = ({ value, unit, size = 'medium' }: { value: number | undefined; unit?: string; size?: 'small' | 'medium' }) => (
  <div style={{ lineHeight: 1.2 }}>
    <Text strong style={{ fontSize: size === 'small' ? 13 : 15 }}>
      {value !== undefined ? value.toFixed(2) : '-'}
    </Text>
    {unit && value !== undefined && (
      <Text type="secondary" style={{ fontSize: size === 'small' ? 10 : 11, marginLeft: 2 }}>{unit}</Text>
    )}
  </div>
);

const PreviewThumbnail = ({ url, label, height = 80 }: { url?: string; label: string; height?: number }) => (
  <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
    <div style={{ 
        height, 
        background: '#f8fafc', 
        borderRadius: 6, 
        border: '1px solid #f1f5f9',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    }}>
        <Image
          height="100%"
          src={url}
          fallback="https://placehold.co/120x80?text=No+Preview"
          style={{ objectFit: 'contain' }}
          preview={{
            mask: <div style={{ fontSize: 10 }}>View</div>,
          }}
        />
    </div>
    <div style={{ marginTop: 4 }}>
      <Text type="secondary" style={{ fontSize: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
        {label}
      </Text>
    </div>
  </div>
);

// --- Main Component ---

const DataPanel: React.FC<DataPanelProps> = ({ vertebrae, discs, globalMetrics }) => {
  
  const renderVertebrae = () => (
    <List
      dataSource={vertebrae}
      renderItem={(item) => (
        <List.Item style={{ padding: '8px 0' }}>
          <Card 
            size="small" 
            variant="borderless" 
            hoverable
            style={{ width: '100%', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <Row gutter={16} align="middle">
              <Col span={10}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ 
                    width: 28, height: 28, background: '#0f172a', color: 'white', 
                    borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 600, fontSize: 13, marginRight: 8
                  }}>
                    {item.level}
                  </div>
                  <Text strong>Vertebra</Text>
                </div>
                <Row gutter={[8, 12]}>
                  <Col span={12}>
                    <MetricLabel label="VH Ant" />
                    <MetricValue value={item.vh_anterior} unit="mm" />
                  </Col>
                  <Col span={12}>
                    <MetricLabel label="VH Post" />
                    <MetricValue value={item.vh_posterior} unit="mm" />
                  </Col>
                  <Col span={24}>
                    <MetricLabel label="AP Diameter" />
                    <MetricValue value={item.ap_diameter} unit="mm" />
                  </Col>
                </Row>
              </Col>
              <Col span={14}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <PreviewThumbnail url={item.preview_url_vh} label="Sagittal (VH)" />
                  <PreviewThumbnail url={item.preview_url_ap} label="Axial (AP)" />
                </div>
              </Col>
            </Row>
          </Card>
        </List.Item>
      )}
    />
  );

  const renderDiscs = () => (
    <List
      dataSource={discs}
      renderItem={(item) => (
        <List.Item style={{ padding: '8px 0' }}>
          <Card 
            size="small" 
            variant="borderless" 
            hoverable
            style={{ width: '100%', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <Row gutter={16} align="middle">
              <Col span={10}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ 
                    width: 50, height: 28, background: '#334155', color: 'white', 
                    borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 600, fontSize: 11, marginRight: 8
                  }}>
                    {item.level}
                  </div>
                  <Text strong>Disc</Text>
                </div>
                
                {/* Main Metrics */}
                <Row gutter={[8, 8]}>
                  <Col span={12}>
                    <MetricLabel label="DH" tooltip="Disc Height" />
                    <MetricValue value={item.dh} unit="mm" />
                  </Col>
                  <Col span={12}>
                    <MetricLabel label="DHI" tooltip="Disc Height Index" />
                    <MetricValue value={item.dhi} />
                  </Col>
                  <Col span={12}>
                    <MetricLabel label="HDR" tooltip="Height-to-Depth Ratio" />
                    <MetricValue value={item.hdr} />
                  </Col>
                  <Col span={12}>
                    <MetricLabel label="DIA" tooltip="Disc Inclination Angle" />
                    <MetricValue value={item.dia} unit="°" />
                  </Col>
                </Row>

                <Divider style={{ margin: '8px 0' }} />
                
                {/* Scan Heights Sub-section */}
                <div style={{ marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Scan Heights (mm)
                    </Text>
                </div>
                <Row gutter={8}>
                    <Col span={8}>
                        <MetricLabel label="A" />
                        <MetricValue value={item.scan_height_a} size="small" />
                    </Col>
                    <Col span={8}>
                        <MetricLabel label="M" />
                        <MetricValue value={item.scan_height_m} size="small" />
                    </Col>
                    <Col span={8}>
                        <MetricLabel label="P" />
                        <MetricValue value={item.scan_height_p} size="small" />
                    </Col>
                </Row>
              </Col>
              <Col span={14}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <PreviewThumbnail url={item.preview_url_dm} label="Measurement (DM)" />
                  <PreviewThumbnail url={item.preview_url_dia} label="Angle (DIA)" />
                </div>
              </Col>
            </Row>
          </Card>
        </List.Item>
      )}
    />
  );

  const renderGlobal = () => {
    if (!globalMetrics) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    
    const herniationMetrics = [
      { label: 'PD', fullName: 'Protrusion Distance', value: globalMetrics.pd, unit: 'mm' },
      { label: 'PA', fullName: 'Protrusion Area', value: globalMetrics.pa, unit: 'mm²' },
      { label: 'PAR', fullName: 'Protrusion Area Ratio', value: globalMetrics.par, unit: '' },
      { label: 'PLR', fullName: 'Protrusion Length Ratio', value: globalMetrics.plr, unit: '' },
    ];

    const spinalMetrics = [
      { label: 'Lumbar Lordosis', key: 'll', value: globalMetrics.ll, url: globalMetrics.preview_url_ll },
      { label: 'Sacral Slope', key: 'ss', value: globalMetrics.ss, url: globalMetrics.preview_url_ss },
      { label: 'Lumbosacral Angle', key: 'lsa', value: globalMetrics.lsa, url: globalMetrics.preview_url_lsa },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
        
        {/* Top Section: Herniation Severity */}
        <div>
          <Title level={5} style={{ marginBottom: 8, color: '#0f172a' }}>
            Herniation Severity Index
          </Title>
          
          <Card 
            variant="borderless" 
            style={{ background: '#f8fafc', borderRadius: 16 }}
            bodyStyle={{ padding: 12 }}
          >
            <Row gutter={12} style={{ height: '100%', minHeight: 240 }}>
              {/* Left: Metrics Grid (2x2) - 占据更多空间 */}
              <Col span={16}>
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Row gutter={[8, 8]} style={{ flex: 1, height: '100%' }}>
                    {herniationMetrics.map((m) => (
                      <Col span={12} key={m.label} style={{ display: 'flex' }}>
                        <Card 
                          size="small"
                          style={{ 
                            background: 'white', 
                            borderRadius: 12, 
                            border: '1px solid #e2e8f0',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                          bodyStyle={{ padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', flex: 1, textAlign: 'center' }}
                        >
                          <Tooltip title={m.fullName}>
                            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 8, textAlign: 'center', width: '100%' }}>
                              {m.label}
                            </Text>
                          </Tooltip>
                          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                            <Statistic 
                              value={m.value ?? '-'} 
                              precision={m.value !== null && m.value !== undefined ? 2 : 0}
                              suffix={m.value !== null && m.value !== undefined ? m.unit : ''}
                              valueStyle={{ 
                                color: '#0f172a', 
                                fontWeight: 700, 
                                fontSize: 22,
                                lineHeight: 1.2,
                                textAlign: 'center'
                              }} 
                            />
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              </Col>

              {/* Right: Vertical Image - 缩小宽度 */}
              <Col span={8}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%',
                  minHeight: 240
                }}>
                  <div style={{ 
                    height: '100%',
                    maxHeight: 240,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'white',
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden'
                  }}>
                    {globalMetrics.preview_url_herniation ? (
                      <Image
                        src={globalMetrics.preview_url_herniation}
                        style={{ 
                          height: '100%',
                          maxHeight: 240,
                          width: '100%',
                          objectFit: 'contain' 
                        }}
                        preview={{
                          mask: <div style={{ fontSize: 12 }}>View Full Size</div>,
                        }}
                      />
                    ) : (
                      <div style={{ padding: 40, textAlign: 'center' }}>
                        <Text type="secondary">No herniation summary available</Text>
                      </div>
                    )}
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </div>

        {/* Bottom Section: Spinal Alignment */}
        <div>
          <Title level={5} style={{ marginBottom: 8, color: '#0f172a' }}>
            Spinal Alignment
          </Title>
          
          <Row gutter={[12, 12]}>
            {spinalMetrics.map((m) => (
              <Col span={8} key={m.key}>
                <Card 
                  size="small" 
                  variant="borderless" 
                  style={{ background: '#f8fafc', borderRadius: 16, height: '100%' }}
                  bodyStyle={{ padding: 12, display: 'flex', flexDirection: 'column', height: '100%' }}
                >
                  {/* Aligned Title Area */}
                  <div style={{ minHeight: 40, display: 'flex', alignItems: 'flex-start' }}>
                    <Text type="secondary" style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2 }}>
                      {m.label}
                    </Text>
                  </div>

                  {/* Aligned Value Area */}
                  <div style={{ margin: '8px 0' }}>
                    <Statistic 
                      value={m.value} 
                      precision={1} 
                      suffix="°" 
                      valueStyle={{ color: '#0f172a', fontWeight: 700, fontSize: 24 }} 
                    />
                  </div>

                  {/* Aligned Image Area */}
                  <div style={{ flex: 1, marginTop: 'auto' }}>
                    <PreviewThumbnail 
                      url={m.url} 
                      label={`${m.label} View`} 
                      height={100} 
                    />
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>
    );
  };

  const tabItems = [
    {
      key: 'global',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={16} /> Global
        </span>
      ),
      children: renderGlobal(),
    },
    {
      key: 'vertebrae',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlignVerticalJustifyCenter size={16} /> Vertebrae
        </span>
      ),
      children: renderVertebrae(),
    },
    {
      key: 'discs',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Ruler size={16} /> Discs
        </span>
      ),
      children: renderDiscs(),
    },
  ];

  return (
    <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 16, overflow: 'hidden' }}>
      <Tabs 
        defaultActiveKey="global" 
        items={tabItems} 
        type="card"
        tabBarStyle={{ margin: 0, background: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(10px)', padding: '8px 8px 0 8px' }}
        style={{ flex: 1, overflow: 'hidden' }}
        className="custom-tabs"
      />
      <style>{`
        .custom-tabs .ant-tabs-content {
            height: 100%;
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            position: relative;
        }
        .custom-tabs .ant-tabs-content-holder {
            position: relative;
        }
        .custom-tabs .ant-tabs-tabpane {
            animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(5px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        .custom-tabs .ant-tabs-nav {
            margin: 0 !important;
            backdrop-filter: blur(10px);
            background: rgba(255, 255, 255, 0.3) !important;
        }
        .custom-tabs .ant-tabs-nav-list {
            width: 100%;
            display: flex;
        }
        .custom-tabs .ant-tabs-nav .ant-tabs-tab {
            border-radius: 8px 8px 0 0;
            border: none;
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(8px);
            flex: 1;
            text-align: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }
        .custom-tabs .ant-tabs-nav .ant-tabs-tab:hover {
            background: rgba(255, 255, 255, 0.4) !important;
            backdrop-filter: blur(12px);
        }
        .custom-tabs .ant-tabs-nav .ant-tabs-tab-active {
            background: rgba(255, 255, 255, 0.85) !important;
            backdrop-filter: blur(15px);
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .custom-tabs .ant-tabs-nav .ant-tabs-tab::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            transition: left 0.5s;
        }
        .custom-tabs .ant-tabs-nav .ant-tabs-tab:hover::before {
            left: 100%;
        }
        .custom-tabs .ant-tabs-ink-bar {
            display: none;
        }
      `}</style>
    </div>
  );
};

export default DataPanel;
