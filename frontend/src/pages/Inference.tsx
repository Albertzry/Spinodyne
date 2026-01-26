import React, { useState } from 'react';
import { 
  Form, 
  Input, 
  DatePicker, 
  Button, 
  Upload, 
  Typography, 
  message, 
  theme,
  Row,
  Col
} from 'antd';
import { UploadCloud, FileUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { UploadProps } from 'antd/es/upload/interface';
import PageTransition from '../components/PageTransition';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const Inference: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { token } = theme.useToken();

  const onFinish = async (values: any) => {
    const { patientName, patientId, studyDate, file } = values;

    if (!file || !file.fileList || file.fileList.length === 0) {
      message.error('Please upload an MRI file.');
      return;
    }

    const formData = new FormData();
    formData.append('patient_name', patientName);
    formData.append('patient_id_external', patientId);
    formData.append('study_date', studyDate.format('YYYY-MM-DD'));
    formData.append('file', file.fileList[0].originFileObj);

    setLoading(true);

    try {
      const response = await fetch('/api/tasks/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      message.success('Inference task created successfully');
      navigate(`/result/${data.task_id}`);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      message.error('Failed to create task. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    maxCount: 1,
    accept: '.nii.gz',
    beforeUpload: (file) => {
        const isNiiGz = file.name.endsWith('.nii.gz');
        if (!isNiiGz) {
            message.error(`${file.name} is not a valid .nii.gz file`);
        }
        return false;
    },
  };

  return (
    <PageTransition>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 'calc(100vh - 128px)',
        padding: '24px'
      }}>
        <div className="glass-panel" style={{ 
          width: '100%', 
          maxWidth: 640, 
          padding: '48px',
          background: 'rgba(255, 255, 255, 0.8)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ 
                width: 64, height: 64, 
                background: 'var(--brand-gradient)', 
                borderRadius: 16, 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginBottom: 20,
                boxShadow: '0 8px 24px rgba(0, 106, 254, 0.2)'
            }}>
                <FileUp size={32} color="white" />
            </div>
            <Title level={2} style={{ marginBottom: 8 }}>New Spine Analysis</Title>
            <Text type="secondary" style={{ fontSize: 15 }}>
              Enter patient details and upload MRI data (.nii.gz)
            </Text>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
              studyDate: dayjs(),
            }}
            requiredMark={false}
          >
            <Form.Item
              name="patientName"
              label={<Text strong>Patient Name</Text>}
              rules={[{ required: true, message: 'Patient name is required' }]}
            >
              <Input placeholder="Full Name" size="large" />
            </Form.Item>

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  name="patientId"
                  label={<Text strong>Patient ID</Text>}
                  rules={[{ required: true, message: 'ID is required' }]}
                >
                  <Input placeholder="Case Number" size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="studyDate"
                  label={<Text strong>Study Date</Text>}
                  rules={[{ required: true, message: 'Date is required' }]}
                >
                  <DatePicker style={{ width: '100%' }} size="large" format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="file"
              label={<Text strong>MRI Data (.nii.gz)</Text>}
              rules={[{ required: true, message: 'MRI file is required' }]}
              valuePropName="file"
            >
              <Dragger {...uploadProps} style={{ 
                  background: '#F8FAFC', 
                  border: '2px dashed #E2E8F0',
                  borderRadius: 16,
                  padding: '24px'
              }}>
                <p className="ant-upload-drag-icon">
                  <UploadCloud size={48} color={token.colorPrimary} strokeWidth={1.5} />
                </p>
                <p className="ant-upload-text" style={{ fontWeight: 600 }}>
                  Click or drag file to this area to upload
                </p>
                <p className="ant-upload-hint">
                  Support for medical NIfTI volumes (.nii.gz)
                </p>
              </Dragger>
            </Form.Item>

            <Form.Item style={{ marginTop: 40, marginBottom: 0 }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large" 
                loading={loading}
                block
                style={{ 
                    height: 54, 
                    fontSize: 16, 
                    fontWeight: 600,
                }}
              >
                {loading ? 'Processing Upload...' : 'Initialize Analysis'}
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </PageTransition>
  );
};

export default Inference;
