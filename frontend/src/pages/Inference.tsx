import React, { useState, useRef, useCallback } from 'react';
import {
  Form,
  Input,
  DatePicker,
  Upload,
  Typography,
  message,
  theme,
  Row,
  Col,
  Segmented,
  Badge,
} from 'antd';
import { UploadCloud, FileUp, FolderUp, X, FileImage } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import type { UploadProps } from 'antd/es/upload/interface';
import PageTransition from '../components/PageTransition';
import { MotionCard, MotionButton, MotionContainer, MotionItem } from '../components/MotionComponents';
import { AnimatePresence, motion } from 'framer-motion';

import { useTheme } from '../context/ThemeContext';

const { Title, Text } = Typography;
const { Dragger } = Upload;

type UploadMode = 'nifti' | 'dicom';

const Inference: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const { token } = theme.useToken();
  const { isDarkMode } = useTheme();

  const [uploadMode, setUploadMode] = useState<UploadMode>('nifti');
  const [dicomFiles, setDicomFiles] = useState<File[]>([]);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Filter for DICOM files (common extensions and files without extension)
    const dcmFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = file.name.toLowerCase();
      // Accept .dcm files, or files without extension (common in DICOM)
      if (name.endsWith('.dcm') || name.endsWith('.ima') || name.endsWith('.dicom') || !name.includes('.')) {
        dcmFiles.push(file);
      }
    }

    if (dcmFiles.length === 0) {
      message.error(t('inferencePage.noDicomFiles'));
      return;
    }

    setDicomFiles(dcmFiles);
    // Set a dummy value so form validation passes
    form.setFieldsValue({ file: { fileList: [{ name: 'dicom_folder' }] } });
    message.success(t('inferencePage.dicomFilesSelected', { count: dcmFiles.length }));
  }, [form, t]);

  const clearDicomFiles = useCallback(() => {
    setDicomFiles([]);
    form.setFieldsValue({ file: undefined });
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  }, [form]);

  const onFinish = async (values: any) => {
    const { patientName, patientId, studyDate, file } = values;

    if (uploadMode === 'nifti') {
      // Existing NIfTI upload logic
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
    } else {
      // DICOM folder upload logic
      if (dicomFiles.length === 0) {
        message.error(t('inferencePage.noDicomFilesError'));
        return;
      }

      const formData = new FormData();
      formData.append('patient_name', patientName);
      formData.append('patient_id_external', patientId);
      formData.append('study_date', studyDate.format('YYYY-MM-DD'));

      // Append all DICOM files
      for (const f of dicomFiles) {
        formData.append('files', f);
      }

      setLoading(true);

      try {
        const response = await fetch('/api/tasks/upload-dicom', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          throw new Error(errData?.detail || t('inferencePage.uploadFailed'));
        }

        const data = await response.json();
        message.success(t('inferencePage.success'));
        navigate(`/result/${data.task_id}`);
      } catch (error: any) {
        console.error('Error uploading DICOM files:', error);
        message.error(error.message || t('inferencePage.errorConnection'));
      } finally {
        setLoading(false);
      }
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

  const handleModeChange = (value: string | number) => {
    setUploadMode(value as UploadMode);
    // Clear file selection when switching modes
    form.setFieldsValue({ file: undefined });
    setDicomFiles([]);
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  return (
    <PageTransition>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 128px)',
        padding: '0px'
      }}>
        <MotionCard
          className="glass-panel"
          noHoverLift
          style={{
            width: '100%',
            maxWidth: 1000,
            padding: '32px 48px',
          }}
        >
          <MotionContainer delayChildren={0} staggerChildren={0.04}>
            <MotionItem>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{
                  width: 56, height: 56,
                  background: 'var(--brand-gradient)',
                  borderRadius: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                  boxShadow: '0 8px 24px rgba(0, 106, 254, 0.2)'
                }}>
                  <FileUp size={28} color="white" />
                </div>
                <Title level={3} style={{ marginBottom: 4 }}>{t('inferencePage.title')}</Title>
                <Text type="secondary" style={{ fontSize: 14 }}>
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
                  label={<Text strong>{t('inferencePage.mriData')}</Text>}
                  style={{ marginBottom: 8 }}
                >
                  <Segmented
                    value={uploadMode}
                    onChange={handleModeChange}
                    options={[
                      {
                        label: (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px' }}>
                            <FileUp size={16} />
                            <span>{t('inferencePage.modeNifti')}</span>
                          </div>
                        ),
                        value: 'nifti',
                      },
                      {
                        label: (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px' }}>
                            <FolderUp size={16} />
                            <span>{t('inferencePage.modeDicom')}</span>
                          </div>
                        ),
                        value: 'dicom',
                      },
                    ]}
                    block
                    style={{ marginBottom: 12 }}
                  />
                </Form.Item>
              </MotionItem>

              <MotionItem>
                <Form.Item
                  name="file"
                  rules={[{ required: true, message: uploadMode === 'nifti' ? t('inferencePage.mriDataRequired') : t('inferencePage.dicomRequired') }]}
                  valuePropName="file"
                >
                  <Dragger
                    {...(uploadMode === 'nifti' ? uploadProps : {
                      showUploadList: false,
                      openFileDialogOnClick: false,
                      beforeUpload: () => false,
                    })}
                    style={{
                      background: isDarkMode ? 'rgba(15, 23, 42, 0.8)' : '#F8FAFC',
                      border: isDarkMode ? '2px dashed #334155' : '2px dashed #E2E8F0',
                      borderRadius: 16,
                    }}
                  >
                    {/* 
                        Use an inner container that spans the desired height.
                        By passing clicks conditionally, we can invoke the DICOM folder selector 
                        without triggering AntD's internal file selector mechanism. 
                    */}
                    <div 
                      onClick={(e) => {
                        if (uploadMode === 'dicom') {
                          e.stopPropagation();
                          folderInputRef.current?.click();
                        }
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        height: 160,          // Gives standard ~190px total height with Dragger padding
                        position: 'relative',
                        cursor: uploadMode === 'dicom' ? 'pointer' : undefined,
                      }}
                    >
                      <input
                        ref={folderInputRef}
                        type="file"
                        /* @ts-expect-error webkitdirectory is non-standard */
                        webkitdirectory="true"
                        directory=""
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleFolderSelect}
                        onClick={(e) => e.stopPropagation()}
                      />

                      <AnimatePresence mode="wait">
                        {uploadMode === 'nifti' ? (
                          <motion.div
                            key="nifti"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            style={{ width: '100%', position: 'absolute', top: '50%', left: 0, marginTop: '-55px' }}
                          >
                            <p className="ant-upload-drag-icon" style={{ marginBottom: 16 }}>
                              <UploadCloud size={48} color={token.colorPrimary} strokeWidth={1.5} style={{ margin: '0 auto' }} />
                            </p>
                            <p className="ant-upload-text" style={{ fontWeight: 600, margin: '0 0 4px 0', fontSize: 16 }}>
                              {t('inferencePage.uploadText')}
                            </p>
                            <p className="ant-upload-hint" style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
                              {t('inferencePage.uploadHint')}
                            </p>
                          </motion.div>
                        ) : dicomFiles.length > 0 ? (
                          <motion.div
                            key="dicom-ready"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            style={{ width: '100%', position: 'absolute', top: '50%', left: 0, marginTop: '-55px' }}
                          >
                            <div style={{ marginBottom: 16 }}>
                              <Badge count={dicomFiles.length} style={{ backgroundColor: token.colorPrimary }}>
                                <div style={{
                                  width: 48,
                                  height: 48,
                                  background: `${token.colorPrimary}15`,
                                  borderRadius: 12,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}>
                                  <FileImage size={28} color={token.colorPrimary} strokeWidth={1.5} />
                                </div>
                              </Badge>
                            </div>
                            <p className="ant-upload-text" style={{ fontWeight: 600, margin: '0 0 4px 0', fontSize: 16 }}>
                              {t('inferencePage.dicomFilesReady', { count: dicomFiles.length })}
                            </p>
                            <p className="ant-upload-hint" style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
                              {t('inferencePage.clickToReselect')}
                            </p>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                clearDicomFiles();
                              }}
                              style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                transition: 'background 0.2s',
                              }}
                            >
                              <X size={14} />
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="dicom-empty"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            style={{ width: '100%', position: 'absolute', top: '50%', left: 0, marginTop: '-55px' }}
                          >
                            <p className="ant-upload-drag-icon" style={{ marginBottom: 16 }}>
                              <FolderUp size={48} color={token.colorPrimary} strokeWidth={1.5} style={{ margin: '0 auto' }} />
                            </p>
                            <p className="ant-upload-text" style={{ fontWeight: 600, margin: '0 0 4px 0', fontSize: 16 }}>
                              {t('inferencePage.selectDicomFolder')}
                            </p>
                            <p className="ant-upload-hint" style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
                              {t('inferencePage.dicomHint')}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </Dragger>
                </Form.Item>
              </MotionItem>

              <MotionItem>
                <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
                  <MotionButton
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={loading}
                    block
                    style={{
                      height: 56,
                      fontSize: 16,
                      fontWeight: 600,
                      padding: '12px 32px',
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
