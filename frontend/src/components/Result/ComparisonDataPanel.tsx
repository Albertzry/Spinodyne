import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Space, Tag, Select, Row, Col } from 'antd';
import { ArrowUp, ArrowDown, Minus, Activity, AlignVerticalJustifyCenter, Ruler, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { AnalysisResult } from '../../pages/ResultDashboard';
import { GlobalMetric } from './DataPanel';
import { MotionContainer, MotionItem } from '../MotionComponents';

const { Text } = Typography;

interface ComparisonDataPanelProps {
    oldData: AnalysisResult;
    newData: AnalysisResult;
}

const MetricDiff = ({ oldVal, newVal, inverseLogic = false }: { oldVal?: number; newVal?: number; inverseLogic?: boolean }) => {
    if (oldVal === undefined || newVal === undefined || oldVal === null || newVal === null) return <Text>-</Text>;

    const diff = newVal - oldVal;
    const isIncrease = diff > 0;
    const isNeutral = diff === 0;

    // Color logic: Red for increase, Green for decrease unless inverseLogic is true
    const color = isNeutral ? 'gray' : (isIncrease ? (inverseLogic ? '#10B981' : '#EF4444') : (inverseLogic ? '#EF4444' : '#10B981'));
    const Icon = isNeutral ? Minus : (isIncrease ? ArrowUp : ArrowDown);

    return (
        <Space size={4}>
            <Text style={{ color, fontWeight: 600 }}>
                {Math.abs(diff).toFixed(2)}
            </Text>
            <Icon size={12} color={color} />
        </Space>
    );
};

const ComparisonDataPanel: React.FC<ComparisonDataPanelProps> = ({ oldData, newData }) => {
    const { t } = useTranslation();
    const { isDarkMode } = useTheme();
    const [activeTab, setActiveTab] = useState('global');
    const [selectedLevels, setSelectedLevels] = useState<string[]>([]);

    // Clear selection when tab changes
    useEffect(() => {
        setSelectedLevels([]);
    }, [activeTab]);

    // Data Helpers
    const getLevels = (type: 'vertebrae' | 'discs') => {
        return type === 'vertebrae'
            ? (newData.vertebrae || []).map((v: any) => v.level)
            : (newData.discs || []).map((d: any) => d.level);
    };

    const filterOptions = (activeTab === 'vertebrae' || activeTab === 'discs')
        ? getLevels(activeTab).map(l => ({ value: l, label: l }))
        : [];

    const columnsGlobal = [
        {
            title: t('comparison.metric', 'Metric'),
            dataIndex: 'label',
            key: 'label',
            render: (text: string) => <Text strong>{text}</Text>
        },
        {
            title: t('comparison.previous', 'Initial'),
            dataIndex: 'oldVal',
            key: 'oldVal',
            align: 'center' as const,
            render: (val: number, record: any) => <Text>{val?.toFixed(2) ?? '-'} <Text type="secondary" style={{ fontSize: 10 }}>{record.unit}</Text></Text>
        },
        {
            title: t('comparison.current', 'Follow-up'),
            dataIndex: 'newVal',
            key: 'newVal',
            align: 'center' as const,
            render: (val: number, record: any) => <Text>{val?.toFixed(2) ?? '-'} <Text type="secondary" style={{ fontSize: 10 }}>{record.unit}</Text></Text>
        },
        {
            title: t('comparison.change', 'Change'),
            key: 'diff',
            align: 'center' as const,
            render: (_: any, record: any) => <MetricDiff oldVal={record.oldVal} newVal={record.newVal} inverseLogic={record.inverse} />
        }
    ];

    const getGlobalDataSource = () => {
        const gOld = oldData.global_metrics || {} as GlobalMetric;
        const gNew = newData.global_metrics || {} as GlobalMetric;

        return [
            { key: 'll', label: t('dataPanel.ll', 'Lumbar Lordosis'), oldVal: gOld.ll, newVal: gNew.ll, unit: '°', inverse: true },
            { key: 'ss', label: t('dataPanel.ss', 'Sacral Slope'), oldVal: gOld.ss, newVal: gNew.ss, unit: '°', inverse: true },
            { key: 'lsa', label: t('dataPanel.lsa', 'LSA'), oldVal: gOld.lsa, newVal: gNew.lsa, unit: '°', inverse: true },
        ];
    };

    const getHerniationDataSource = () => {
        const gOld = oldData.global_metrics || {} as GlobalMetric;
        const gNew = newData.global_metrics || {} as GlobalMetric;
        return [
            { key: 'pd', label: t('dataPanel.pdFull', 'Protrusion Distance'), oldVal: gOld.pd, newVal: gNew.pd, unit: 'mm', inverse: false },
            { key: 'pa', label: t('dataPanel.paFull', 'Protrusion Area'), oldVal: gOld.pa, newVal: gNew.pa, unit: 'mm²', inverse: false },
            { key: 'par', label: t('dataPanel.parFull', 'Protrusion Area Ratio'), oldVal: gOld.par, newVal: gNew.par, unit: '', inverse: false },
        ];
    };

    const renderLevelsComparison = (type: 'vertebrae' | 'discs') => {
        let levels = getLevels(type);

        if (selectedLevels.length > 0) {
            levels = levels.filter(l => selectedLevels.includes(l));
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {levels.map((level: string) => {
                    const itemOld = type === 'vertebrae'
                        ? oldData.vertebrae?.find((v: any) => v.level === level)
                        : oldData.discs?.find((d: any) => d.level === level);
                    const itemNew = type === 'vertebrae'
                        ? newData.vertebrae?.find((v: any) => v.level === level)
                        : newData.discs?.find((d: any) => d.level === level);

                    if (!itemNew) return null;

                    const metrics = type === 'vertebrae'
                        ? [
                            { label: t('dataPanel.vhAnt'), key: 'vh_anterior', unit: 'mm' },
                            { label: t('dataPanel.vhPost'), key: 'vh_posterior', unit: 'mm' },
                            { label: t('dataPanel.apDiameter'), key: 'ap_diameter', unit: 'mm' },
                        ]
                        : [
                            { label: t('dataPanel.dh'), key: 'dh', unit: 'mm', inverse: true },
                            { label: t('dataPanel.dhi'), key: 'dhi', unit: '', inverse: true },
                            { label: t('dataPanel.hdr'), key: 'hdr', unit: '' },
                            { label: t('dataPanel.dia'), key: 'dia', unit: '°' },
                        ];

                    const dataSource = metrics.map(m => ({
                        ...m,
                        oldVal: (itemOld as any)?.[m.key],
                        newVal: (itemNew as any)?.[m.key]
                    }));

                    return (
                        <MotionItem key={level}>
                            <Card
                                size="small"
                                title={<Tag color="blue">{level}</Tag>}
                                style={{
                                    background: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : 'white',
                                    borderRadius: 12,
                                    border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 106, 254, 0.08)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                                hoverable
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 106, 254, 0.1)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
                            >
                                <Table
                                    dataSource={dataSource}
                                    columns={[
                                        { title: t('comparison.metric', 'Metric'), dataIndex: 'label', key: 'label' },
                                        { title: t('comparison.previous', 'Initial'), dataIndex: 'oldVal', align: 'center', render: (v: number, r: any) => v !== undefined && v !== null ? (<span><Text>{v.toFixed(2)}</Text> <Text type="secondary" style={{ fontSize: 10 }}>{r.unit}</Text></span>) : '-' },
                                        { title: t('comparison.current', 'Follow-up'), dataIndex: 'newVal', align: 'center', render: (v: number, r: any) => v !== undefined && v !== null ? (<span><Text>{v.toFixed(2)}</Text> <Text type="secondary" style={{ fontSize: 10 }}>{r.unit}</Text></span>) : '-' },
                                        { title: t('comparison.change', 'Change'), key: 'diff', align: 'center', render: (_: any, r: any) => <MetricDiff oldVal={r.oldVal} newVal={r.newVal} inverseLogic={r.inverse} /> }
                                    ]}
                                    pagination={false}
                                    size="small"
                                    rowKey="label"
                                />
                            </Card>
                        </MotionItem>
                    );
                })}
            </div>
        );
    };

    const tabItems = [
        {
            key: 'global',
            label: <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Activity size={16} /> {t('dataPanel.tabs.global')}</span>
        },
        {
            key: 'vertebrae',
            label: <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><AlignVerticalJustifyCenter size={16} /> {t('dataPanel.tabs.vertebrae')}</span>
        },
        {
            key: 'discs',
            label: <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ruler size={16} /> {t('dataPanel.tabs.discs')}</span>
        }
    ];

    const activeTabIndex = tabItems.findIndex(item => item.key === activeTab);

    return (
        <div className="glass-panel" style={{ padding: 0, borderRadius: 16, height: '100%', overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
            {/* Custom Tab Bar */}
            <div style={{
                background: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : 'rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(10px)',
                padding: '8px',
                borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 106, 254, 0.05)',
                position: 'relative',
            }}>
                <div style={{ display: 'flex', gap: 4, position: 'relative' }}>
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
                            pointerEvents: 'none'
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
                                    zIndex: 2,
                                }}
                            >
                                {item.label}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Filter Bar + Herniation Summary (discs tab) */}
            {(activeTab === 'vertebrae' || activeTab === 'discs') && (
                <div style={{
                    position: 'absolute',
                    top: 57,
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    padding: activeTab === 'discs' ? '6px 16px 6px 16px' : '6px 16px 14px 16px',
                }}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.55)',
                        backdropFilter: 'blur(8px)',
                        mask: 'linear-gradient(to bottom, black 80%, transparent 100%)',
                        WebkitMask: 'linear-gradient(to bottom, black 80%, transparent 100%)',
                        pointerEvents: 'none',
                        zIndex: -1
                    }} />

                    {/* Herniation summary — only in discs tab */}
                    {activeTab === 'discs' && (
                        <div style={{ marginBottom: 8 }}>
                            <Row gutter={8}>
                                {getHerniationDataSource().map(item => {
                                    const hasData = item.oldVal !== undefined && item.oldVal !== null
                                        && item.newVal !== undefined && item.newVal !== null;
                                    return (
                                        <Col key={item.key} span={8}>
                                            <div style={{
                                                background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255,255,255,0.8)',
                                                border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,106,254,0.1)',
                                                borderRadius: 10,
                                                padding: '8px 12px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 4,
                                            }}>
                                                {/* Label */}
                                                <Text style={{ fontSize: 11, color: isDarkMode ? '#94A3B8' : '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                    {item.label}
                                                </Text>
                                                {/* Values row */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                                                    <div style={{ textAlign: 'center', flex: 1 }}>
                                                        <div style={{ fontSize: 10, color: isDarkMode ? '#64748B' : '#94A3B8', marginBottom: 1 }}>{t('comparison.previous', 'Init')}</div>
                                                        <Text style={{ fontSize: 13, fontWeight: 600, color: isDarkMode ? '#CBD5E1' : '#475569' }}>
                                                            {hasData ? (item.oldVal as number).toFixed(2) : '-'}
                                                            {hasData && item.unit && <Text type="secondary" style={{ fontSize: 10, marginLeft: 1 }}>{item.unit}</Text>}
                                                        </Text>
                                                    </div>
                                                    <div style={{ color: isDarkMode ? '#475569' : '#CBD5E1' }}>→</div>
                                                    <div style={{ textAlign: 'center', flex: 1 }}>
                                                        <div style={{ fontSize: 10, color: isDarkMode ? '#64748B' : '#94A3B8', marginBottom: 1 }}>{t('comparison.current', 'F/U')}</div>
                                                        <Text style={{ fontSize: 13, fontWeight: 600, color: isDarkMode ? '#F1F5F9' : '#1E293B' }}>
                                                            {hasData ? (item.newVal as number).toFixed(2) : '-'}
                                                            {hasData && item.unit && <Text type="secondary" style={{ fontSize: 10, marginLeft: 1 }}>{item.unit}</Text>}
                                                        </Text>
                                                    </div>
                                                    <div style={{ borderLeft: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`, paddingLeft: 8, textAlign: 'center', flex: 1 }}>
                                                        <div style={{ fontSize: 10, color: isDarkMode ? '#64748B' : '#94A3B8', marginBottom: 1 }}>{t('comparison.change', 'Δ')}</div>
                                                        <MetricDiff oldVal={item.oldVal} newVal={item.newVal} inverseLogic={item.inverse} />
                                                    </div>
                                                </div>
                                            </div>
                                        </Col>
                                    );
                                })}
                            </Row>
                        </div>
                    )}

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
                            options={filterOptions}
                            allowClear
                            popupClassName={isDarkMode ? 'dark-select-dropdown' : ''}
                            dropdownStyle={{
                                background: isDarkMode ? 'rgba(30, 41, 59, 0.3)' : 'rgba(255, 255, 255, 0.3)',
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

            {/* Content Area */}
            <div style={{
                flex: 1,
                padding: 16,
                paddingTop: activeTab === 'discs' ? 148 : (activeTab === 'vertebrae' ? 60 : 16),
                position: 'relative'
            }}>
                <div key={activeTab} className="tab-content-enter">
                    {activeTab === 'global' && (
                        <div style={{ padding: 16 }}>
                            <Table
                                dataSource={getGlobalDataSource()}
                                columns={columnsGlobal}
                                pagination={false}
                                rowKey="key"
                                style={{ background: 'transparent' }}
                            />
                        </div>
                    )}
                    {(activeTab === 'vertebrae' || activeTab === 'discs') && (
                        <MotionContainer>
                            {renderLevelsComparison(activeTab as 'vertebrae' | 'discs')}
                        </MotionContainer>
                    )}
                </div>
            </div>

            <style>{`
                .tab-content-enter {
                  animation: slideIn 0.35s cubic-bezier(0.4, 0, 0.2, 1);
                }
                @keyframes slideIn {
                  from { opacity: 0; transform: translateX(20px); }
                  to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
};

export default ComparisonDataPanel;
