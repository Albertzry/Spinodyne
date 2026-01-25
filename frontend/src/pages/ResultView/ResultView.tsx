import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, message, Spin, Typography, Descriptions, Tag, Row, Col, Card, Space } from 'antd';
import { ArrowLeft, Calendar, User, FileText } from 'lucide-react';
import dayjs from 'dayjs';
import NiivueViewer from '../../components/Medical/NiivueViewer';
import ResultPanel from '../../components/Charts/ResultPanel';
import api from '../../services/api';

const { Title, Text } = Typography;

interface TaskInfo {
  id: string;
  patient_name: string;
  patient_id: string;
  study_date: string;
  status: string;
  created_at: string;
  finished_at: string | null;
}

const ResultView: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [taskInfo, setTaskInfo] = useState<TaskInfo | null>(null);
  const [vis3dData, setVis3dData] = useState<any>(null);

  useEffect(() => {
    if (taskId) {
      loadTaskData(taskId);
    }
  }, [taskId]);

  const loadTaskData = async (id: string) => {
    setLoading(true);
    try {
      const statusResponse = await api.get(`/status/${id}`);
      setTaskInfo(statusResponse.data);

      if (statusResponse.data.status === 'success') {
        const volumes3dResponse = await api.get(`/result/3d/${id}`);
        setVis3dData(volumes3dResponse.data);
      }
    } catch (error) {
      console.error('Failed to load task data:', error);
      message.error('Failed to load result data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <Spin size="large" tip="Loading Patient Data..." />
      </div>
    );
  }

  if (!taskInfo) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <Text className="text-slate-400">Task not found</Text>
          <br />
          <Button type="primary" onClick={() => navigate('/patients')} className="mt-4">
            Back to Patient Records
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col p-2 md:p-4 gap-4 overflow-hidden bg-slate-50/30">
      {/* Header Info Card */}
      <Card size="small" className="shadow-sm border-slate-200 rounded-xl" bodyStyle={{ padding: '12px 16px' }}>
        <Row justify="space-between" align="middle" gutter={[16, 8]}>
          <Col xs={24} md={12}>
            <Space size={12}>
              <Button icon={<ArrowLeft size={16} />} onClick={() => navigate('/patients')} type="text" />
              <div className="h-4 w-px bg-slate-200" />
              <div>
                <Title level={5} className="!mb-0">Patient Analysis Result</Title>
                <Text className="text-[10px] text-slate-400 font-mono">{taskInfo.id}</Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Descriptions column={{ xs: 2, sm: 3, md: 3 }} size="small" colon={false}>
              <Descriptions.Item label={<User size={12} className="text-slate-400" />}>
                <Text strong size="small">{taskInfo.patient_name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={<FileText size={12} className="text-slate-400" />}>
                <Text className="text-xs font-mono">{taskInfo.patient_id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={<Calendar size={12} className="text-slate-400" />}>
                <Text className="text-xs">{dayjs(taskInfo.study_date).format('YYYY-MM-DD')}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>

      {/* Main Content Area */}
      {taskInfo.status === 'success' ? (
        <Row gutter={[16, 16]} className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
          <Col xs={24} lg={12} xl={13} className="h-[50vh] lg:h-full">
            <div className="h-full rounded-2xl overflow-hidden bg-black shadow-lg border border-slate-800">
              <NiivueViewer volumes={vis3dData} />
            </div>
          </Col>

          <Col xs={24} lg={12} xl={11} className="h-auto lg:h-full overflow-y-auto lg:overflow-hidden">
            <ResultPanel taskUid={taskId || null} />
          </Col>
        </Row>
      ) : (
        <Card className="flex-1 flex items-center justify-center border-slate-200 rounded-2xl">
          <div className="text-center">
            <Spin size="large" />
            <Text className="block mt-6 text-slate-500 font-medium">
              {taskInfo.status === 'processing' ? 'AI Model is processing...' : 'Task is pending in queue'}
            </Text>
            <Button onClick={() => loadTaskData(taskInfo.id)} icon={<RefreshCw size={14} />} className="mt-4">Refresh Status</Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ResultView;
