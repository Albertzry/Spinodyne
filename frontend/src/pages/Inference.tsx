import React, { useState } from 'react';
import { 
  Form, 
  Input, 
  DatePicker, 
  Button, 
  Upload, 
  Typography, 
  message, 
  ConfigProvider, 
  theme 
} from 'antd';
import { UploadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import PageTransition from '../components/PageTransition';

const { Title } = Typography;
const { Dragger } = Upload;

const Inference: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { token } = theme.useToken();

  const onFinish = async (values: any) => {
    const { patientName, patientId, studyDate, file } = values;

    if (!file || file.fileList.length === 0) {
      message.error('Please upload an MRI file.');
      return;
    }

    const formData = new FormData();
    formData.append('patient_name', patientName);
    formData.append('patient_id', patientId);
    formData.append('study_date', studyDate.format('YYYY-MM-DD'));
    // Ant Design Upload puts the file in fileList[0].originFileObj
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
      message.success('Upload successful! Starting analysis...');
      
      // Fire-and-forget: Navigate immediately to result page
      navigate(`/result/${data.task_id}`);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      message.error('Failed to upload file. Please try again.');
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
            message.error(`${file.name} is not a valid MRI file (.nii.gz)`);
        }
        return false; // Prevent auto upload
    },
    onDrop(e) {
      console.log('Dropped files', e.dataTransfer.files);
    },
  };

  return (
    <PageTransition>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        padding: '20px'
      }}>
        <div className="glass-panel" style={{ 
          width: '100%', 
          maxWidth: 600, 
          padding: 40, 
          borderRadius: 24,
          background: 'rgba(255, 255, 255, 0.65)' 
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Title level={2} style={{ marginBottom: 8, color: token.colorPrimary }}>
              New Inference
            </Title>
            <Typography.Text type="secondary">
              Upload patient MRI data for spinal analysis
            </Typography.Text>
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
              label="Patient Name"
              rules={[{ required: true, message: 'Please enter patient name' }]}
            >
              <Input placeholder="Ex: John Doe" size="large" />
            </Form.Item>

            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item
                name="patientId"
                label="Patient ID"
                style={{ flex: 1 }}
                rules={[{ required: true, message: 'Please enter patient ID' }]}
              >
                <Input placeholder="Ex: P-12345" size="large" />
              </Form.Item>

              <Form.Item
                name="studyDate"
                label="Study Date"
                style={{ flex: 1 }}
                rules={[{ required: true, message: 'Please select date' }]}
              >
                <DatePicker style={{ width: '100%' }} size="large" format="YYYY-MM-DD" />
              </Form.Item>
            </div>

            <Form.Item
              name="file"
              label="MRI Scan File"
              rules={[{ required: true, message: 'Please upload a file' }]}
              valuePropName="file" // Important for Upload component validation
            >
              <Dragger {...uploadProps} style={{ 
                  background: 'rgba(255,255,255,0.4)', 
                  border: '1px dashed #94a3b8',
                  borderRadius: 12,
                  padding: 20
              }}>
                <p className="ant-upload-drag-icon">
                  <UploadCloud size={48} color={token.colorPrimary} strokeWidth={1.5} />
                </p>
                <p className="ant-upload-text" style={{ fontSize: 16, color: '#334155' }}>
                  Click or drag MRI file to this area
                </p>
                <p className="ant-upload-hint" style={{ color: '#64748b' }}>
                  Support for .nii.gz format only
                </p>
              </Dragger>
            </Form.Item>

            <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large" 
                loading={loading}
                block
                style={{ 
                    height: 48, 
                    fontSize: 16, 
                    fontWeight: 500,
                    boxShadow: '0 4px 14px 0 rgba(15, 23, 42, 0.3)'
                }}
              >
                {loading ? 'Uploading & Starting...' : 'Start Analysis'}
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </PageTransition>
  );
};

export default Inference;
