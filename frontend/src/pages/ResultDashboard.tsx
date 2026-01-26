import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Skeleton, Result, Button, Row, Col, Steps, Card, Spin, Descriptions, Divider } from 'antd';
import { LoadingOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Brain, FileText } from 'lucide-react';
import PageTransition from '../components/PageTransition';
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
        <Text type="secondary">Loading visualizations...</Text>
      </div>
    );
  }

  if (error || !result) {
    return (
      <Result
        status="error"
        title="Error Loading Results"
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
    <div style={{ paddingBottom: 40 }}>
       {/* Header Section */}
       <div style={{ marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 16, color: '#0f172a' }}>Clinical Analysis Result</Title>
          <Descriptions 
            bordered 
            size="small" 
            items={[
                { label: 'Patient Name', children: taskInfo.patient_name },
                { label: 'Patient ID', children: taskInfo.patient_id_external },
                { label: 'Study Date', children: taskInfo.study_date },
                { label: 'Task ID', children: <Text copyable style={{ fontSize: 12 }}>{taskInfo.id}</Text> },
            ]}
            style={{ background: 'rgba(255,255,255,0.5)', borderRadius: 8, overflow: 'hidden' }}
          />
       </div>

       <Divider style={{ margin: '24px 0' }} />

       {/* Main Split Layout (50/50) */}
       <Row gutter={[24, 24]}>
            {/* Left Panel: Niivue 3D Viewer */}
            <Col xs={24} lg={12}>
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
            </Col>

            {/* Right Panel: Clinical Data */}
            <Col xs={24} lg={12}>
                <div style={{ height: 600 }}>
                    <DataPanel 
                        vertebrae={result.vertebrae || []}
                        discs={result.discs || []}
                        globalMetrics={result.global_metrics}
                    />
                </div>
            </Col>
       </Row>
    </div>
  );
};

const ResultDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

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
            title="Analysis Failed"
            subTitle={task?.error_message || error || "An unexpected error occurred during processing."}
            extra={[
              <Button type="primary" key="retry" onClick={() => window.location.reload()}>
                Retry
              </Button>,
              <Button key="back" onClick={() => navigate('/inference')}>
                Back to Upload
              </Button>,
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

  return (
    <PageTransition>
        <div style={{ minHeight: 'calc(100vh - 120px)' }}>
            {/* Split Screen Layout (Processing State) */}
            <Row gutter={[24, 24]} style={{ height: '100%' }}>
                
                {/* Left Panel: Processing Animation */}
                <Col xs={24} lg={12} style={{ height: 600, display: 'flex', flexDirection: 'column' }}>
                    <div className="glass-panel" style={{ 
                        flex: 1, 
                        borderRadius: 16, 
                        padding: 0, 
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(15, 23, 42, 0.02)'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ marginBottom: 32, position: 'relative', display: 'inline-block' }}>
                                <div style={{ 
                                    width: 120, height: 120, 
                                    borderRadius: '50%', 
                                    background: 'rgba(15, 23, 42, 0.05)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    position: 'relative',
                                    zIndex: 1
                                }}>
                                    <Brain size={64} color="#0f172a" style={{ opacity: 0.5 }} />
                                </div>
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                    borderRadius: '50%',
                                    border: '4px solid #0f172a',
                                    opacity: 0.2,
                                    animation: 'pulse 2s infinite'
                                }} />
                            </div>
                            <Title level={3} style={{ color: '#0f172a' }}>AI Analyzing Spine Data</Title>
                            <Text type="secondary">Segmenting vertebrae and identifying anomalies...</Text>
                            
                            <div style={{ marginTop: 40, width: 300, margin: '40px auto 0' }}>
                                <Steps
                                    current={task?.status === 'processing' ? 1 : 0}
                                    items={[
                                        { title: 'Upload', icon: <CheckCircleOutlined /> },
                                        { title: 'Processing', icon: <LoadingOutlined /> },
                                        { title: 'Result', icon: <ClockCircleOutlined /> },
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                </Col>

                {/* Right Panel: Skeletons */}
                <Col xs={24} lg={12} style={{ height: 600 }}>
                    <div className="glass-panel" style={{ 
                        height: '100%', 
                        borderRadius: 16, 
                        padding: 24,
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'rgba(255, 255, 255, 0.8)'
                    }}>
                        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <FileText size={20} color="#0f172a" />
                            <Title level={4} style={{ margin: 0 }}>Analysis Report</Title>
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <Card variant="borderless" style={{ background: 'rgba(255,255,255,0.5)' }}>
                                <Skeleton active avatar paragraph={{ rows: 1 }} />
                            </Card>
                            <Card variant="borderless" style={{ background: 'rgba(255,255,255,0.5)' }}>
                                <Skeleton active title={false} paragraph={{ rows: 3 }} />
                            </Card>
                            <Card variant="borderless" style={{ background: 'rgba(255,255,255,0.5)' }}>
                                <Skeleton active title={false} paragraph={{ rows: 3 }} />
                            </Card>
                             <Card variant="borderless" style={{ background: 'rgba(255,255,255,0.5)', flex: 1 }}>
                                <Skeleton active title={false} paragraph={{ rows: 4 }} />
                            </Card>
                        </div>
                    </div>
                </Col>
            </Row>
            
            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.2; }
                    50% { transform: scale(1.2); opacity: 0; }
                    100% { transform: scale(1); opacity: 0; }
                }
            `}</style>
        </div>
    </PageTransition>
  );
};

export default ResultDashboard;
