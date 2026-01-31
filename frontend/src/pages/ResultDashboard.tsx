import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Typography, Skeleton, Result, Row, Col, Steps, Card, Spin, Descriptions, Divider } from 'antd';
import { LoadingOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Brain, FileText } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import dayjs from 'dayjs';
import PageTransition from '../components/PageTransition';
import { MotionCard, MotionButton, MotionContainer, MotionItem } from '../components/MotionComponents';
import NiivuePanel from '../components/Result/NiivuePanel';
import DataPanel, { VertebraResult, DiscResult, GlobalMetric } from '../components/Result/DataPanel';

const { Title, Text } = Typography;

interface Task {
  id: string;
  patient_name: string;
  patient_id: string;
  study_date: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  error_message?: string;
  created_at: string;
}

interface AnalysisResult {
  task_id: string;
  status: string;
  task_info?: {
    id: string;
    patient_name: string;
    patient_id_external: string;
    study_date: string;
  };
  // Fallback fields for backward compatibility
  patient_id?: string;
  study_date?: string;
  three_d: {
    raw_url: string;
    structure_mask_url: string;
    ldh_mask_url: string;
  };
  vertebrae: VertebraResult[];
  discs: DiscResult[];
  global_metrics: GlobalMetric | null;
}

const SuccessView: React.FC<{ taskId: string }> = ({ taskId }) => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();

  const textColor = isDarkMode ? '#F1F5F9' : '#0f172a';
  const descBg = isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255,255,255,0.5)';

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const response = await fetch(`/api/tasks/${taskId}/result`);
        if (!response.ok) throw new Error('Failed to load analysis results');
        const data = await response.json();
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [taskId]);

  if (loading) {
    return (
      <div style={{ height: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <Spin size="large" />
        <Text type="secondary">{t('resultPage.loading')}</Text>
      </div>
    );
  }

  if (error || !result) {
    return (
      <Result
        status="error"
        title={t('resultPage.errorTitle')}
        subTitle={error}
      />
    );
  }

  // Safe access to task info with fallbacks
  const taskInfo = result.task_info || {
    id: result.task_id || taskId,
    patient_name: 'Unknown',
    patient_id_external: result.patient_id || 'N/A',
    study_date: result.study_date || 'N/A'
  };

  return (
    <MotionContainer style={{ paddingBottom: 40 }}>
      {/* Header Section */}
      <MotionItem style={{ marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 16, color: textColor }}>{t('resultPage.title')}</Title>
        <Descriptions
          bordered
          size="small"
          items={[
            { label: t('resultPage.patientName'), children: taskInfo.patient_name },
            { label: t('resultPage.patientId'), children: taskInfo.patient_id_external },
            { label: t('resultPage.studyDate'), children: taskInfo.study_date },
            { label: t('resultPage.taskId'), children: <Text copyable style={{ fontSize: 12 }}>{taskInfo.id}</Text> },
          ]}
          style={{ background: descBg, borderRadius: 8, overflow: 'hidden' }}
        />
      </MotionItem>

      <Divider style={{ margin: '24px 0' }} />

      {/* Main Split Layout (50/50) */}
      <Row gutter={[24, 24]}>
        {/* Left Panel: Niivue 3D Viewer */}
        <Col xs={24} lg={12}>
          <MotionItem>
            <div className="glass-panel" style={{
              height: 600,
              borderRadius: 16,
              overflow: 'hidden',
              background: '#000'
            }}>
              <NiivuePanel
                rawUrl={result.three_d?.raw_url}
                structureMaskUrl={result.three_d?.structure_mask_url}
                ldhMaskUrl={result.three_d?.ldh_mask_url}
              />
            </div>
          </MotionItem>
        </Col>

        {/* Right Panel: Clinical Data */}
        <Col xs={24} lg={12}>
          <MotionItem>
            <div style={{ height: 600 }}>
              <DataPanel
                vertebrae={result.vertebrae || []}
                discs={result.discs || []}
                globalMetrics={result.global_metrics}
              />
            </div>
          </MotionItem>
        </Col>
      </Row>
    </MotionContainer>
  );
};

const ResultDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { isDarkMode } = useTheme();

  const textColor = isDarkMode ? '#F1F5F9' : '#0f172a';
  const descBg = isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255,255,255,0.5)';
  const iconBg = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.05)';

  const fetchTaskStatus = async () => {
    if (!id) return;
    try {
      const response = await fetch(`/api/tasks/${id}`);
      if (!response.ok) {
        if (response.status === 404) throw new Error('Task not found');
        throw new Error('Failed to fetch task status');
      }
      const data = await response.json();
      setTask(data);

      // Stop polling if final state reached
      if (data.status === 'success' || data.status === 'failed') {
        stopPolling();
      }
    } catch (err) {
      console.error('Error fetching task:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      stopPolling();
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    // Initial fetch
    fetchTaskStatus();
    // Poll every 2 seconds
    pollingRef.current = setInterval(fetchTaskStatus, 2000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [id]);

  // Error State
  if (error || (task && task.status === 'failed')) {
    return (
      <PageTransition>
        <div className="glass-panel" style={{ margin: 24, padding: 40, borderRadius: 16, minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Result
            status="error"
            title={t('resultPage.analysisFailed')}
            subTitle={task?.error_message || error || t('resultPage.unexpectedError')}
            extra={[
              <MotionButton type="primary" key="retry" onClick={() => window.location.reload()}>
                {t('resultPage.retry')}
              </MotionButton>,
              <MotionButton key="back" onClick={() => navigate('/inference')}>
                {t('resultPage.backToUpload')}
              </MotionButton>,
            ]}
          />
        </div>
      </PageTransition>
    );
  }

  // Loading / Processing State
  const isProcessing = loading || !task || task.status === 'pending' || task.status === 'processing';

  if (!isProcessing && task?.status === 'success') {
    return (
      <PageTransition>
        <SuccessView taskId={task.id} />
      </PageTransition>
    );
  }

  // Get task info for header
  const taskInfo = task ? {
    id: task.id,
    patient_name: task.patient_name || 'Unknown',
    patient_id_external: task.patient_id || 'N/A',
    study_date: task.study_date || task.created_at ? dayjs(task.created_at).format('YYYY-MM-DD') : 'N/A'
  } : null;

  return (
    <PageTransition>
      <div style={{ minHeight: 'calc(100vh - 120px)' }}>
        {/* Header Section */}
        {taskInfo && (
          <MotionContainer>
            <MotionItem style={{ marginBottom: 24 }}>
              <Title level={3} style={{ marginBottom: 16, color: textColor }}>{t('resultPage.title')}</Title>
              <Descriptions
                bordered
                size="small"
                items={[
                  { label: t('resultPage.patientName'), children: taskInfo.patient_name },
                  { label: t('resultPage.patientId'), children: taskInfo.patient_id_external },
                  { label: t('resultPage.studyDate'), children: taskInfo.study_date },
                  { label: t('resultPage.taskId'), children: <Text copyable style={{ fontSize: 12 }}>{taskInfo.id}</Text> },
                ]}
                style={{ background: descBg, borderRadius: 8, overflow: 'hidden' }}
              />
            </MotionItem>
            <Divider style={{ margin: '24px 0' }} />
          </MotionContainer>
        )}

        {/* Split Screen Layout (Processing State) */}
        <Row gutter={[24, 24]} style={{ height: '100%' }}>

          {/* Left Panel: Processing Animation */}
          <Col xs={24} lg={12} style={{ height: 600, display: 'flex', flexDirection: 'column' }}>
            <MotionContainer delayChildren={0.2} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <MotionCard className="glass-panel" noHoverLift style={{
                flex: 1,
                borderRadius: 16,
                padding: 30,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  textAlign: 'center',
                  width: '100%',
                  padding: '20px',
                  boxSizing: 'border-box',
                  overflow: 'visible'
                }}>
                  <div style={{
                    marginBottom: 32,
                    position: 'relative',
                    display: 'inline-block',
                    width: 160,
                    height: 160,
                    overflow: 'visible'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      background: iconBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1
                    }}>
                      <Brain size={64} color={textColor} style={{ opacity: 0.5 }} />
                    </div>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      border: `4px solid ${textColor}`,
                      opacity: 0.2,
                      animation: 'pulse 2s infinite',
                      boxSizing: 'border-box'
                    }} />
                  </div>
                  <Title level={3} style={{ color: textColor, marginBottom: 8, fontSize: 20 }}>{t('resultPage.analyzingTitle')}</Title>
                  <Text type="secondary" style={{ fontSize: 14 }}>{t('resultPage.analyzingDesc')}</Text>

                  <div style={{ marginTop: 32, width: '100%', padding: '0 10px', boxSizing: 'border-box' }}>
                    <Steps
                      current={task?.status === 'processing' ? 1 : 0}
                      items={[
                        { title: t('resultPage.stepUpload'), icon: <CheckCircleOutlined /> },
                        { title: t('resultPage.stepProcessing'), icon: <LoadingOutlined /> },
                        { title: t('resultPage.stepResult'), icon: <ClockCircleOutlined /> },
                      ]}
                      style={{ width: '100%' }}
                      size="small"
                    />
                  </div>
                </div>
              </MotionCard>
            </MotionContainer>
          </Col>

          {/* Right Panel: Skeletons */}
          <Col xs={24} lg={12} style={{ height: 600 }}>
            <MotionContainer delayChildren={0.4} style={{ height: '100%' }}>
              <MotionCard className="glass-panel" noHoverLift style={{
                height: '100%',
                borderRadius: 16,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxSizing: 'border-box'
              }}>
                <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <FileText size={20} color={textColor} />
                  <Title level={4} style={{ margin: 0 }}>{t('resultPage.reportTitle')}</Title>
                </div>

                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  overflow: 'hidden',
                  minHeight: 0
                }}>
                  <Card variant="borderless" style={{ background: descBg, flexShrink: 0 }}>
                    <Skeleton active avatar paragraph={{ rows: 1 }} />
                  </Card>
                  <Card variant="borderless" style={{ background: descBg, flexShrink: 0 }}>
                    <Skeleton active title={false} paragraph={{ rows: 2 }} />
                  </Card>
                  <Card variant="borderless" style={{ background: descBg, flexShrink: 0 }}>
                    <Skeleton active title={false} paragraph={{ rows: 2 }} />
                  </Card>
                  <Card variant="borderless" style={{
                    background: descBg,
                    flex: 1,
                    minHeight: 0,
                    overflow: 'hidden'
                  }}>
                    <Skeleton active title={false} paragraph={{ rows: 3 }} />
                  </Card>
                </div>
              </MotionCard>
            </MotionContainer>
          </Col>
        </Row>

        <style>{`
                @keyframes pulse {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 0.2; }
                    50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0; }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
                }
            `}</style>
      </div>
    </PageTransition>
  );
};

export default ResultDashboard;
