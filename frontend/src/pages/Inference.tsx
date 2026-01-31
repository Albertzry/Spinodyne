import React, { useState } from 'react';
import {
  Form,
  Input,
  DatePicker,
  Upload,
  Typography,
  message,
  theme,
  Row,
  Col
} from 'antd';
import { UploadCloud, FileUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import type { UploadProps } from 'antd/es/upload/interface';
import PageTransition from '../components/PageTransition';
import { MotionCard, MotionButton, MotionContainer, MotionItem } from '../components/MotionComponents';

import { useTheme } from '../context/ThemeContext';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const Inference: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const { token } = theme.useToken();
  const { isDarkMode } = useTheme();

  const onFinish = async (values: any) => {
    const { patientName, patientId, studyDate, file } = values;

    if (!file || !file.fileList || file.fileList.length === 0) {
      message.error(t('inferencePage.uploadError'));
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
        throw new Error(t('inferencePage.uploadFailed'));
      }

      const data = await response.json();
      message.success(t('inferencePage.success'));
      navigate(`/result/${data.task_id}`);

    } catch (error) {
      console.error('Error uploading file:', error);
      message.error(t('inferencePage.errorConnection'));
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
        message.error(t('inferencePage.invalidFile', { fileName: file.name }));
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
        <MotionCard
          className="glass-panel"
          noHoverLift
          style={{
            width: '100%',
            maxWidth: 1200,
            padding: '48px',
          }}
        >
          <MotionContainer delayChildren={0} staggerChildren={0.04}>
            <MotionItem>
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
                <Title level={2} style={{ marginBottom: 8 }}>{t('inferencePage.title')}</Title>
                <Text type="secondary" style={{ fontSize: 15 }}>
                  {t('inferencePage.subtitle')}
                </Text>
              </div>
            </MotionItem>

            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{
                studyDate: dayjs(),
              }}
              requiredMark={false}
            >
              <MotionItem>
                <Form.Item
                  name="patientName"
                  label={<Text strong>{t('inferencePage.patientName')}</Text>}
                  rules={[{ required: true, message: t('inferencePage.patientNameRequired') }]}
                >
                  <Input placeholder={t('inferencePage.patientNamePlaceholder')} size="large" />
                </Form.Item>
              </MotionItem>

              <Row gutter={24}>
                <Col span={12}>
                  <MotionItem>
                    <Form.Item
                      name="patientId"
                      label={<Text strong>{t('inferencePage.patientId')}</Text>}
                      rules={[{ required: true, message: t('inferencePage.patientIdRequired') }]}
                    >
                      <Input placeholder={t('inferencePage.patientIdPlaceholder')} size="large" />
                    </Form.Item>
                  </MotionItem>
                </Col>
                <Col span={12}>
                  <MotionItem>
                    <Form.Item
                      name="studyDate"
                      label={<Text strong>{t('inferencePage.studyDate')}</Text>}
                      rules={[{ required: true, message: t('inferencePage.studyDateRequired') }]}
                    >
                      <DatePicker style={{ width: '100%' }} size="large" format="YYYY-MM-DD" />
                    </Form.Item>
                  </MotionItem>
                </Col>
              </Row>

              <MotionItem>
                <Form.Item
                  name="file"
                  label={<Text strong>{t('inferencePage.mriData')}</Text>}
                  rules={[{ required: true, message: t('inferencePage.mriDataRequired') }]}
                  valuePropName="file"
                >
                  <Dragger {...uploadProps} style={{
                    background: isDarkMode ? 'rgba(15, 23, 42, 0.8)' : '#F8FAFC',
                    border: isDarkMode ? `2px dashed ${isDarkMode ? '#334155' : '#E2E8F0'}` : '2px dashed #E2E8F0',
                    borderRadius: 16,
                    padding: '24px'
                  }}>
                    <p className="ant-upload-drag-icon">
                      <UploadCloud size={48} color={token.colorPrimary} strokeWidth={1.5} />
                    </p>
                    <p className="ant-upload-text" style={{ fontWeight: 600 }}>
                      {t('inferencePage.uploadText')}
                    </p>
                    <p className="ant-upload-hint">
                      {t('inferencePage.uploadHint')}
                    </p>
                  </Dragger>
                </Form.Item>
              </MotionItem>

              <MotionItem>
                <Form.Item style={{ marginTop: 40, marginBottom: 0 }}>
                  <MotionButton
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={loading}
                    block
                    style={{
                      height: 68,
                      fontSize: 17,
                      fontWeight: 600,
                      padding: '15px 32px',
                      lineHeight: 1.2,
                    }}
                  >
                    {loading ? t('inferencePage.processing') : t('inferencePage.initialize')}
                  </MotionButton>
                </Form.Item>
              </MotionItem>
            </Form>
          </MotionContainer>
        </MotionCard>
      </div>
    </PageTransition>
  );
};

export default Inference;
