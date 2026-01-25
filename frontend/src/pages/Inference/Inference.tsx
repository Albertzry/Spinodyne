import React, { useState, useEffect } from 'react';
import { Upload, message, Spin, Typography, Button, Form, Input, DatePicker, Row, Col, Space, Card } from 'antd';
import { Inbox, FileText, Activity, RefreshCw, ArrowLeft } from 'lucide-react';
import dayjs from 'dayjs';
import NiivueViewer from '../../components/Medical/NiivueViewer';
import ResultPanel from '../../components/Charts/ResultPanel';
import api from '../../services/api';

const { Dragger } = Upload;
const { Title, Text } = Typography;

const Inference: React.FC = () => {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [vis3dData, setVis3dData] = useState<any>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    let intervalId: any;

    if (step === 1 && taskId) {
      intervalId = setInterval(async () => {
        try {
          const response = await api.get(`/status/${taskId}`);
          const { status } = response.data;

          if (status === 'success') {
            const volumes3dResponse = await api.get(`/result/3d/${taskId}`);
            setVis3dData(volumes3dResponse.data);
            setStep(2);
            message.success('AI Inference completed successfully.');
            clearInterval(intervalId);
          } else if (status === 'failed') {
            message.error('AI Inference failed. Please try again.');
            setStep(0);
            clearInterval(intervalId);
          }
        } catch (error) {
          console.error('Error polling status:', error);
        }
      }, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [step, taskId]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    return false;
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      message.error('Please select a file first.');
      return;
    }

    try {
      const values = await form.validateFields();
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('patient_name', values.patient_name);
      formData.append('patient_id', values.patient_id);
      
      if (values.study_date) {
        formData.append('study_date', values.study_date.format('YYYY-MM-DD'));
      }

      setStep(1);
      const response = await api.post('/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setTaskId(response.data.task_id);
      message.success('Task created successfully. Processing...');
    } catch (error: any) {
      console.error('Upload failed:', error);
      message.error(error.errorFields ? 'Please fill in all required fields.' : 'Upload failed.');
      setStep(0);
    }
  };

  const reset = () => {
    setStep(0);
    setVis3dData(null);
    setTaskId(null);
    setSelectedFile(null);
    form.resetFields();
  };

  // Main Layout Content
  const renderContent = () => {
    if (step === 0) {
      return (
        <div className="h-full flex items-center justify-center p-4 md:p-8">
          <Card className="max-w-2xl w-full shadow-lg rounded-2xl border-slate-100" bodyStyle={{ padding: '24px' }}>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Inbox size={24} className="text-sky-500" />
              </div>
              <Title level={3} className="!mb-1">Upload Imaging</Title>
              <Text className="text-slate-400 text-sm">NIfTI format (.nii.gz, .nii). Max 500MB.</Text>
            </div>
            
            <Form form={form} layout="vertical" initialValues={{ study_date: dayjs() }}>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Patient Name" name="patient_name" rules={[{ required: true }]}>
                    <Input placeholder="Name" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Patient ID" name="patient_id" rules={[{ required: true }]}>
                    <Input placeholder="ID" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Study Date" name="study_date">
                <DatePicker size="large" className="w-full" />
              </Form.Item>

              <Form.Item label="Medical Image File">
                <Dragger
                  multiple={false}
                  beforeUpload={handleFileSelect}
                  maxCount={1}
                  className="bg-slate-50/50"
                >
                  <div className="py-4">
                    <FileText size={32} className="text-sky-400 mx-auto mb-2" />
                    <p className="text-sm font-medium">Click or drag file</p>
                  </div>
                </Dragger>
              </Form.Item>

              <Button type="primary" size="large" block onClick={handleSubmit} disabled={!selectedFile} className="h-12 rounded-xl mt-2">
                Start AI Inference
              </Button>
            </Form>
          </Card>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col p-2 md:p-4 gap-4 overflow-hidden">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between bg-white/80 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-sm">
          <Space>
            <Button icon={<ArrowLeft size={16} />} onClick={reset} type="text">Back</Button>
            <div className="h-4 w-px bg-slate-200 mx-1" />
            <Title level={5} className="!mb-0">
              {step === 1 ? 'Processing Analysis' : 'Analysis Result'}
            </Title>
          </Space>
          {step === 2 && (
            <Button icon={<RefreshCw size={14} />} onClick={reset} size="small">New Task</Button>
          )}
        </div>

        {/* Main Adaptive Grid */}
        <Row gutter={[16, 16]} className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
          {/* 3D Viewer Column */}
          <Col xs={24} lg={12} xl={13} className="h-[50vh] lg:h-full">
            <div className="relative h-full rounded-2xl overflow-hidden bg-black shadow-inner border border-slate-800">
              {step === 1 && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white">
                  <Spin size="large" />
                  <div className="mt-6 flex flex-col items-center">
                    <Activity className="animate-pulse text-sky-400 mb-2" size={32} />
                    <Text className="text-white font-medium">AI Model Inferencing...</Text>
                  </div>
                </div>
              )}
              <NiivueViewer volumes={vis3dData} />
            </div>
          </Col>

          {/* Results Column */}
          <Col xs={24} lg={12} xl={11} className="h-auto lg:h-full overflow-y-auto lg:overflow-hidden">
            {step === 1 ? (
              <Card className="h-full flex flex-col items-center justify-center text-center border-slate-100">
                <RefreshCw className="text-sky-400 animate-spin mb-4" size={32} />
                <Text className="text-slate-500 block">Analyzing vertebral structures...</Text>
                <Text className="text-slate-300 text-xs mt-2 font-mono">TASK: {taskId?.substring(0, 8)}</Text>
              </Card>
            ) : (
              <ResultPanel taskUid={taskId} />
            )}
          </Col>
        </Row>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-64px)] bg-slate-50/30">
      {renderContent()}
    </div>
  );
};

export default Inference;
