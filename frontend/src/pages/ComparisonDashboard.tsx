import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Typography, Row, Col, Spin, Button, message, Card, Tag } from 'antd';
import { MotionContainer, MotionItem, MotionCard } from '../components/MotionComponents';
import PageTransition from '../components/PageTransition';
import { ArrowRightLeft } from 'lucide-react';
import NiivuePanel, { LayerState } from '../components/Result/NiivuePanel';
import ComparisonDataPanel from '../components/Result/ComparisonDataPanel';
import { Niivue } from '@niivue/niivue';

const { Title, Text } = Typography;

interface AnalysisResult {
    // Types matching ResultDashboard
    task_id: string;
    status: string;
    task_info?: {
        id: string;
        patient_name: string;
        patient_id_external: string;
        study_date: string;
    };
    patient_id?: string;
    study_date?: string;
    three_d: {
        raw_url: string;
        structure_mask_url: string;
        ldh_mask_url: string;
    };
    vertebrae: any[];
    discs: any[];
    global_metrics: any | null;
}

const ComparisonDashboard: React.FC = () => {
    const { oldId, newId } = useParams<{ oldId: string; newId: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { isDarkMode } = useTheme();

    const [oldData, setOldData] = useState<AnalysisResult | null>(null);
    const [newData, setNewData] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSwapped, setIsSwapped] = useState(false);

    // Shared Layer State for Sync
    const [layerState, setLayerState] = useState<LayerState>({
        showRaw: true,
        showStructure: true,
        showLDH: true,
        viewMode: 'render'
    });

    const handleLayerChange = (key: keyof LayerState, value: any) => {
        setLayerState(prev => ({ ...prev, [key]: value }));
    };

    // Niivue instances for sync
    const oldNvRef = useRef<Niivue | null>(null);
    const newNvRef = useRef<Niivue | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!oldId || !newId) return;
            setLoading(true);
            try {
                const [resOld, resNew] = await Promise.all([
                    fetch(`/api/tasks/${oldId}/result`),
                    fetch(`/api/tasks/${newId}/result`)
                ]);

                if (!resOld.ok || !resNew.ok) throw new Error('Failed to fetch one or more records');

                const dataOld = await resOld.json();
                const dataNew = await resNew.json();

                setOldData(dataOld);
                setNewData(dataNew);
            } catch (error) {
                console.error("Error fetching comparison data:", error);
                message.error(t('comparison.fetchError', 'Failed to load comparison data'));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [oldId, newId]);

    // Sync Logic
    const handleNvLoaded = (type: 'left' | 'right', nv: Niivue) => {
        if (type === 'left') oldNvRef.current = nv;
        else newNvRef.current = nv;

        // Enable broadcast sync only if currently in 3D volume (render) mode
        if (oldNvRef.current && newNvRef.current) {
            if (layerState.viewMode === 'render') {
                oldNvRef.current.broadcastTo(newNvRef.current);
                newNvRef.current.broadcastTo(oldNvRef.current);
                console.log("3D Views Synchronized (Render Mode)");
            } else {
                console.log("3D Views Loaded (Multiplanar - No Action Sync)");
            }
        }
    };

    // Toggle broadcast sync on/off when viewMode changes
    useEffect(() => {
        const nvOld = oldNvRef.current;
        const nvNew = newNvRef.current;
        if (!nvOld || !nvNew) return;

        if (layerState.viewMode === 'render') {
            // Restore original sync methods if we overrode them
            if ((nvOld as any)._origSync) {
                nvOld.sync = (nvOld as any)._origSync;
                delete (nvOld as any)._origSync;
            }
            if ((nvNew as any)._origSync) {
                nvNew.sync = (nvNew as any)._origSync;
                delete (nvNew as any)._origSync;
            }
            // Enable bi-directional broadcast for drag/zoom sync in 3D volume mode
            nvOld.broadcastTo(nvNew);
            nvNew.broadcastTo(nvOld);
            console.log("Broadcast Sync Enabled (Render Mode)");
        } else {
            // NUCLEAR option: completely disable sync in multiplanar mode.
            // 1) Clear otherNV arrays
            (nvOld as any).otherNV = [];
            (nvNew as any).otherNV = [];
            // 2) Reset syncOpts to all-false so even if otherNV leaks, nothing syncs
            const falseSyncOpts = { "3d": false, "2d": false, zoomPan: false, cal_min: false, cal_max: false, clipPlane: false, gamma: false, sliceType: false, crosshair: false };
            (nvOld as any).syncOpts = { ...falseSyncOpts };
            (nvNew as any).syncOpts = { ...falseSyncOpts };
            // 3) Override the sync method itself to be a no-op
            if (!(nvOld as any)._origSync) (nvOld as any)._origSync = nvOld.sync.bind(nvOld);
            if (!(nvNew as any)._origSync) (nvNew as any)._origSync = nvNew.sync.bind(nvNew);
            nvOld.sync = () => {};
            nvNew.sync = () => {};
            console.log("Broadcast Sync Fully Disabled (Multiplanar Mode)");
        }
    }, [layerState.viewMode]);

    const handleSwap = () => {
        setIsSwapped(!isSwapped);
    };

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!oldData || !newData) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <Text type="danger">{t('comparison.error', 'Data not found')}</Text>
                <Button onClick={() => navigate('/records')}>{t('common.back', 'Back')}</Button>
            </div>
        );
    }

    const getInfo = (data: AnalysisResult) => ({
        name: data.task_info?.patient_name || 'Unknown',
        date: data.task_info?.study_date || data.study_date || 'N/A',
        pid: data.task_info?.patient_id_external || data.patient_id || 'N/A'
    });

    // Determine Left/Right Data based on Swap state
    const leftData = isSwapped ? newData : oldData;
    const rightData = isSwapped ? oldData : newData;

    // Labels should generally track the content, but "Previous/Current" might be confusing if swapped.
    // Standard approach: Left is Previous, Right is Current.
    // If swapped, Left is Current, Right is Previous.
    const leftLabelKey = isSwapped ? 'comparison.current' : 'comparison.previous';
    const rightLabelKey = isSwapped ? 'comparison.previous' : 'comparison.current';
    const leftColor = isSwapped ? 'blue' : 'default';
    const rightColor = isSwapped ? 'default' : 'blue';

    const infoLeft = getInfo(leftData);
    const infoRight = getInfo(rightData);

    // Pass data to ComparisonDataPanel: 
    // It expects oldData/newData. If we swap visually, we should probably pass them swapped
    // so the diff logic (Right - Left) matches the visual order.
    // i.e. Diff = Right (newData) - Left (oldData).
    // If swapped, Diff = Right (oldData) - Left (newData).
    // This allows "Left Right Interchange" to fully invert the perspective.

    return (
        <PageTransition>
            <div style={{ paddingBottom: 40 }}>
                <MotionContainer>
                    {/* Header */}
                    <MotionItem style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div>
                                    <Title level={3} style={{ margin: 0 }}>
                                        {t('comparison.title', 'Comparison Analysis')}
                                    </Title>
                                    <Text type="secondary">{infoLeft.name} ({infoLeft.pid})</Text>
                                </div>
                            </div>

                            {/* Data Swap Control */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fff',
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s'
                                }}
                                onClick={handleSwap}
                                className="swap-control"
                            >
                                <Tag color={leftColor}>{infoLeft.date}</Tag>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: 4,
                                    borderRadius: '50%',
                                    background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                                }}>
                                    <ArrowRightLeft size={16} color={isDarkMode ? "#cbd5e1" : "#64748b"} />
                                </div>
                                <Tag color={rightColor}>{infoRight.date}</Tag>
                            </div>
                        </div>
                    </MotionItem>

                    {/* Content Grid */}
                    <Row gutter={[24, 24]}>
                        {/* 3D Views Row */}
                        <Col span={12}>
                            <MotionCard
                                className="glass-panel"
                                style={{ height: 400, borderRadius: 16, overflow: 'hidden', position: 'relative' }}
                                noHoverLift // Disable hover interaction
                            >
                                <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
                                    <Tag color={leftColor}>{t(leftLabelKey)} ({infoLeft.date})</Tag>
                                </div>
                                <NiivuePanel
                                    key={leftData.task_id} // Force re-render on swap to ensure clean state
                                    rawUrl={leftData.three_d.raw_url}
                                    structureMaskUrl={leftData.three_d.structure_mask_url}
                                    ldhMaskUrl={leftData.three_d.ldh_mask_url}
                                    onNvLoaded={(nv) => handleNvLoaded('left', nv)}
                                    layerState={layerState}
                                    onLayerChange={handleLayerChange}
                                />
                            </MotionCard>
                        </Col>
                        <Col span={12}>
                            <MotionCard
                                className="glass-panel"
                                style={{ height: 400, borderRadius: 16, overflow: 'hidden', position: 'relative' }}
                                noHoverLift // Disable hover interaction
                            >
                                <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
                                    <Tag color={rightColor}>{t(rightLabelKey)} ({infoRight.date})</Tag>
                                </div>
                                <NiivuePanel
                                    key={rightData.task_id} // Force re-render on swap
                                    rawUrl={rightData.three_d.raw_url}
                                    structureMaskUrl={rightData.three_d.structure_mask_url}
                                    ldhMaskUrl={rightData.three_d.ldh_mask_url}
                                    onNvLoaded={(nv) => handleNvLoaded('right', nv)}
                                    layerState={layerState}
                                    onLayerChange={handleLayerChange}
                                />
                            </MotionCard>
                        </Col>

                        {/* Data Comparison Row */}
                        <Col span={24}>
                            <div style={{ minHeight: 400 }}>
                                {/* oldData corresponds to Left, newData to Right in standard view. 
                                    We pass Left as "old" and Right as "new" to maintain diff direction relative to layout */}
                                <ComparisonDataPanel oldData={leftData} newData={rightData} />
                            </div>
                        </Col>
                    </Row>

                </MotionContainer>

                <style>{`
                    .swap-control:hover {
                        background: ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#f8fafc'} !important;
                    }
                `}</style>
            </div>
        </PageTransition>
    );
};

// Import helper
import { useTheme } from '../context/ThemeContext';

export default ComparisonDashboard;
