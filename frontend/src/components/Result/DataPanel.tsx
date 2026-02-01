import React, { useState, useEffect } from 'react';
import { Card, List, Typography, Row, Col, Image, Tooltip, Empty, Statistic, Space, Divider, Select } from 'antd';
import { AlignVerticalJustifyCenter, Ruler, Activity, Info, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// Note: Using CSS transitions instead of framer-motion for tab animations to avoid page navigation conflicts
import { MotionContainer, MotionItem } from '../MotionComponents';

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
    {tooltip ? (
      <Tooltip title={tooltip}>
        <span>
          <Info size={10} style={{ color: '#94a3b8', cursor: 'help' }} />
        </span>
      </Tooltip>
    ) : null}
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

const PreviewThumbnail = ({ url, label, height = 80, isDarkMode = false }: { url?: string; label: string; height?: number; isDarkMode?: boolean }) => (
  <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
    <div style={{
      height,
      background: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc',
      borderRadius: 6,
      border: isDarkMode ? '1px solid #334155' : '1px solid #f1f5f9',
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

import { useTheme } from '../../context/ThemeContext';

const DataPanel: React.FC<DataPanelProps> = ({ vertebrae, discs, globalMetrics }) => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('global');

  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);

  // Clear selection when tab changes
  useEffect(() => {
    setSelectedLevels([]);
  }, [activeTab]);

  const filteredVertebrae = selectedLevels.length > 0
    ? vertebrae.filter(v => selectedLevels.includes(v.level))
    : vertebrae;

  const filteredDiscs = selectedLevels.length > 0
    ? discs.filter(d => selectedLevels.includes(d.level))
    : discs;

  const currentOptions = activeTab === 'vertebrae'
    ? vertebrae.map(v => ({ value: v.level, label: v.level }))
    : activeTab === 'discs'
      ? discs.map(d => ({ value: d.level, label: d.level }))
      : [];

  const renderVertebrae = () => (
    <List
      dataSource={filteredVertebrae}
      renderItem={(item, index) => (
        <MotionItem key={`${item.level}-${index}`} style={{ padding: '8px 0' }}>
          <Card
            size="small"
            variant="borderless"
            hoverable
            style={{
              width: '100%',
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              background: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : 'white',
              border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 106, 254, 0.08)',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 106, 254, 0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
          >
            <Row gutter={16} align="middle">
              <Col span={10}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{
                    width: 28, height: 28,
                    background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 106, 254, 0.08)',
                    color: isDarkMode ? '#E2E8F0' : '#006AFE',
                    borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 600, fontSize: 13, marginRight: 8
                  }}>
                    {item.level}
                  </div>
                  <Text strong>{t('dataPanel.vertebra')}</Text>
                </div>
                <Row gutter={[8, 12]}>
                  <Col span={12}>
                    <MetricLabel label={t('dataPanel.vhAnt')} />
                    <MetricValue value={item.vh_anterior} unit="mm" />
                  </Col>
                  <Col span={12}>
                    <MetricLabel label={t('dataPanel.vhPost')} />
                    <MetricValue value={item.vh_posterior} unit="mm" />
                  </Col>
                  <Col span={24}>
                    <MetricLabel label={t('dataPanel.apDiameter')} />
                    <MetricValue value={item.ap_diameter} unit="mm" />
                  </Col>
                </Row>
              </Col>
              <Col span={14}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <PreviewThumbnail url={item.preview_url_vh} label={t('dataPanel.sagittal') + " (VH)"} isDarkMode={isDarkMode} />
                  <PreviewThumbnail url={item.preview_url_ap} label={t('dataPanel.axial') + " (AP)"} isDarkMode={isDarkMode} />
                </div>
              </Col>
            </Row>
          </Card>
        </MotionItem>
      )}
    />
  );

  const renderDiscs = () => (
    <List
      dataSource={filteredDiscs}
      renderItem={(item, index) => (
        <MotionItem key={`${item.level}-${index}`} style={{ padding: '8px 0' }}>
          <Card
            size="small"
            variant="borderless"
            hoverable
            style={{
              width: '100%',
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              background: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : 'white',
              border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 106, 254, 0.08)',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 106, 254, 0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
          >
            <Row gutter={16} align="middle">
              <Col span={10}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{
                    width: 50, height: 28,
                    background: isDarkMode ? 'rgba(0, 106, 254, 0.15)' : 'rgba(0, 106, 254, 0.08)',
                    color: isDarkMode ? '#60A5FA' : '#006AFE',
                    borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 600, fontSize: 11, marginRight: 8
                  }}>
                    {item.level}
                  </div>
                  <Text strong>{t('dataPanel.disc')}</Text>
                </div>

                {/* Main Metrics */}
                <Row gutter={[8, 8]}>
                  <Col span={12}>
                    <MetricLabel label={t('dataPanel.dh')} tooltip={t('dataPanel.dhTooltip')} />
                    <MetricValue value={item.dh} unit="mm" />
                  </Col>
                  <Col span={12}>
                    <MetricLabel label={t('dataPanel.dhi')} tooltip={t('dataPanel.dhiTooltip')} />
                    <MetricValue value={item.dhi} />
                  </Col>
                  <Col span={12}>
                    <MetricLabel label={t('dataPanel.hdr')} tooltip={t('dataPanel.hdrTooltip')} />
                    <MetricValue value={item.hdr} />
                  </Col>
                  <Col span={12}>
                    <MetricLabel label={t('dataPanel.dia')} tooltip={t('dataPanel.diaTooltip')} />
                    <MetricValue value={item.dia} unit="°" />
                  </Col>
                </Row>

                <Divider style={{ margin: '8px 0' }} />

                {/* Scan Heights Sub-section */}
                <div style={{ marginBottom: 4 }}>
                  <Text type="secondary" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('dataPanel.scanHeights')}
                  </Text>
                </div>
                <Row gutter={8}>
                  <Col span={8}>
                    <MetricLabel label={t('dataPanel.scanHeightA')} />
                    <MetricValue value={item.scan_height_a} size="small" />
                  </Col>
                  <Col span={8}>
                    <MetricLabel label={t('dataPanel.scanHeightM')} />
                    <MetricValue value={item.scan_height_m} size="small" />
                  </Col>
                  <Col span={8}>
                    <MetricLabel label={t('dataPanel.scanHeightP')} />
                    <MetricValue value={item.scan_height_p} size="small" />
                  </Col>
                </Row>
              </Col>
              <Col span={14}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <PreviewThumbnail url={item.preview_url_dm} label={t('dataPanel.measurement') + " (DM)"} isDarkMode={isDarkMode} />
                  <PreviewThumbnail url={item.preview_url_dia} label={t('dataPanel.angle') + " (DIA)"} isDarkMode={isDarkMode} />
                </div>
              </Col>
            </Row>
          </Card>
        </MotionItem>
      )}
    />
  );

  const renderGlobal = () => {
    if (!globalMetrics) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;

    const herniationMetrics = [
      { label: t('dataPanel.pd'), fullName: t('dataPanel.pdFull'), value: globalMetrics.pd, unit: 'mm' },
      { label: t('dataPanel.pa'), fullName: t('dataPanel.paFull'), value: globalMetrics.pa, unit: 'mm²' },
      { label: t('dataPanel.par'), fullName: t('dataPanel.parFull'), value: globalMetrics.par, unit: '' },
      { label: t('dataPanel.plr'), fullName: t('dataPanel.plrFull'), value: globalMetrics.plr, unit: '' },
    ];

    const spinalMetrics = [
      { label: t('dataPanel.ll'), key: 'll', value: globalMetrics.ll, url: globalMetrics.preview_url_ll },
      { label: t('dataPanel.ss'), key: 'ss', value: globalMetrics.ss, url: globalMetrics.preview_url_ss },
      { label: t('dataPanel.lsa'), key: 'lsa', value: globalMetrics.lsa, url: globalMetrics.preview_url_lsa },
    ];

    return (
      <MotionContainer style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
        <MotionItem>
          <Title level={5} style={{ marginBottom: 8, color: isDarkMode ? '#F1F5F9' : '#0f172a' }}>
            {t('dataPanel.herniationSeverity')}
          </Title>

          <Card
            variant="borderless"
            style={{
              background: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : 'white',
              borderRadius: 16,
              border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 106, 254, 0.1)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)'
            }}
            styles={{ body: { padding: 16 } }}
          >
            <Row gutter={12} style={{ height: '100%', minHeight: 240 }}>
              <Col span={16}>
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Row gutter={[8, 8]} style={{ flex: 1, height: '100%' }}>
                    {herniationMetrics.map((m) => (
                      <Col span={12} key={m.label} style={{ display: 'flex' }}>
                        <Card
                          size="small"
                          style={{
                            background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
                            borderRadius: 12,
                            border: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 106, 254, 0.1)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                          styles={{ body: { padding: '12px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', flex: 1, textAlign: 'center' } }}
                        >
                          <Tooltip title={m.fullName}>
                            <MetricLabel label={m.label} tooltip={m.fullName} />
                          </Tooltip>
                          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                            <Statistic
                              value={m.value ?? '-'}
                              precision={m.value !== null && m.value !== undefined ? 2 : 0}
                              suffix={m.value !== null && m.value !== undefined ? m.unit : ''}
                              valueStyle={{
                                color: isDarkMode ? '#E2E8F0' : '#0f172a',
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
                    background: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : 'white',
                    borderRadius: 12,
                    border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
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
                        <Text type="secondary">{t('dataPanel.noHerniation')}</Text>
                      </div>
                    )}
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </MotionItem>

        <MotionItem>
          <Title level={5} style={{ marginBottom: 8, color: isDarkMode ? '#F1F5F9' : '#0f172a' }}>
            {t('dataPanel.spinalAlignment')}
          </Title>

          <Row gutter={[12, 12]}>
            {spinalMetrics.map((m) => (
              <Col span={8} key={m.key}>
                <Card
                  size="small"
                  variant="borderless"
                  style={{
                    background: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : 'white',
                    borderRadius: 16,
                    height: '100%',
                    border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 106, 254, 0.1)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 106, 254, 0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.03)'; }}
                  styles={{ body: { padding: 16, display: 'flex', flexDirection: 'column', height: '100%' } }}
                >
                  <div style={{ minHeight: 40, display: 'flex', alignItems: 'flex-start' }}>
                    <Text type="secondary" style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2 }}>
                      {m.label}
                    </Text>
                  </div>

                  <div style={{ margin: '8px 0' }}>
                    <Statistic
                      value={m.value}
                      precision={1}
                      suffix="°"
                      valueStyle={{ color: isDarkMode ? '#E2E8F0' : '#0f172a', fontWeight: 700, fontSize: 24 }}
                    />
                  </div>

                  <div style={{ flex: 1, marginTop: 'auto' }}>
                    <PreviewThumbnail
                      url={m.url}
                      label={`${m.label} ${t('dataPanel.view')}`}
                      height={100}
                      isDarkMode={isDarkMode}
                    />
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </MotionItem>
      </MotionContainer>
    );
  };

  const tabItems = [
    {
      key: 'global',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={16} /> {t('dataPanel.tabs.global')}
        </span>
      ),
    },
    {
      key: 'vertebrae',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlignVerticalJustifyCenter size={16} /> {t('dataPanel.tabs.vertebrae')}
        </span>
      ),
    },
    {
      key: 'discs',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Ruler size={16} /> {t('dataPanel.tabs.discs')}
        </span>
      ),
    },
  ];

  // Calculate active tab index for the sliding indicator
  const activeTabIndex = tabItems.findIndex(item => item.key === activeTab);

  return (
    <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 16, overflow: 'hidden' }}>
      {/* Custom Animated Tab Bar with Gliding Indicator */}
      <div style={{
        background: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : 'rgba(255, 255, 255, 0.3)',
        backdropFilter: 'blur(10px)',
        padding: '8px',
        borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 106, 254, 0.05)',
        position: 'relative',
      }}>
        {/* Tab Items Container */}
        <div style={{ display: 'flex', gap: 4, position: 'relative' }}>
          {/* Gliding Indicator - Positioned relative to the flex container for simpler math */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: `calc(${activeTabIndex} * (100% + 4px) / ${tabItems.length})`,
              width: `calc((100% - ${(tabItems.length - 1) * 4}px) / ${tabItems.length})`,
              height: 40,
              background: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : '#FFFFFF',
              borderRadius: '8px',
              boxShadow: '0 2px 12px rgba(0, 106, 254, 0.12)',
              border: '1px solid rgba(0, 106, 254, 0.2)',
              transition: 'left 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 1,
              pointerEvents: 'none', // Ensure it doesn't block clicks
              boxSizing: 'border-box'
            }}
          />

          {tabItems.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <div
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                style={{
                  flex: 1,
                  height: 40,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? '#006AFE' : '#64748B',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'color 0.3s ease, transform 0.2s ease',
                  borderRadius: '8px',
                  zIndex: 2,
                  position: 'relative',
                }}
                onMouseDown={(e) => {
                  const target = e.currentTarget;
                  target.style.transform = 'scale(0.96)';
                }}
                onMouseUp={(e) => {
                  const target = e.currentTarget;
                  target.style.transform = 'scale(1)';
                }}
                onMouseLeave={(e) => {
                  const target = e.currentTarget;
                  target.style.transform = 'scale(1)';
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'transform 0.15s ease',
                  }}
                >
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Bar with Glassmorphism - Always visible when on vertebrae/discs tabs */}
      {/* Filter Bar with Glassmorphism - Floating over content */}
      {(activeTab === 'vertebrae' || activeTab === 'discs') && (
        <div style={{
          position: 'absolute',
          top: 57, // Height of tab header
          left: 0,
          right: 0,
          zIndex: 10,
          padding: '6px 16px 14px 16px',
        }}>
          {/* Background Glass Strip for the Filter Area */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.55)',
            backdropFilter: 'blur(8px)',
            mask: 'linear-gradient(to bottom, black 80%, transparent 100%)',
            WebkitMask: 'linear-gradient(to bottom, black 80%, transparent 100%)',
            pointerEvents: 'none',
            zIndex: -1
          }} />

          <div style={{
            background: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(4px)',
            borderRadius: 12,
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 106, 254, 0.05)',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)'
          }}>
            <Filter size={16} style={{ margin: '0 8px', color: isDarkMode ? '#94A3B8' : '#64748B' }} />
            <Select
              mode="multiple"
              variant="borderless"
              placeholder={t('dataPanel.filterLevels') || "Filter by Level..."}
              style={{ width: '100%' }}
              maxTagCount="responsive"
              value={selectedLevels}
              onChange={setSelectedLevels}
              options={currentOptions}
              allowClear
              popupClassName={isDarkMode ? 'dark-select-dropdown' : ''}
              dropdownStyle={{
                background: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(16px)',
                border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 106, 254, 0.1)',
                borderRadius: 12,
                boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
                padding: 6
              }}
            />
          </div>
        </div>
      )}

      {/* Tab Content with Slide Animation */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 16,
        paddingTop: (activeTab === 'vertebrae' || activeTab === 'discs') ? 60 : 16, // Top padding to avoid hiding content under filter
        position: 'relative'
      }}>
        <div
          key={activeTab}
          className="tab-content-enter"
          style={{ width: '100%' }}
        >
          {activeTab === 'global' && renderGlobal()}
          {activeTab === 'vertebrae' && (
            <MotionContainer>
              {renderVertebrae()}
            </MotionContainer>
          )}
          {activeTab === 'discs' && (
            <MotionContainer>
              {renderDiscs()}
            </MotionContainer>
          )}
        </div>
      </div>

      <style>{`
        .tab-content-enter {
          animation: slideIn 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div >
  );
};

export default DataPanel;
