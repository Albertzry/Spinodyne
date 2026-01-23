import React, { useState, useEffect } from 'react';
import { Upload, message, Spin, Typography, Space, Button } from 'antd';
import { Inbox, FileText, Activity, RefreshCw } from 'lucide-react';
import NiivueViewer from '../../components/Medical/NiivueViewer';
import ResultPanel from '../../components/Charts/ResultPanel';
import api from '../../services/api';

const { Dragger } = Upload;
const { Title, Text } = Typography;

const Inference: React.FC = () => {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  // const [imageUrl, setImageUrl] = useState<string | null>(null); // Deprecated
  const [analysisResult, setAnalysisResult] = useState<any>(null); // Contains both result data and vis paths
  const [taskUid, setTaskUid] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: any;

    if (step === 1 && taskUid) {
      intervalId = setInterval(async () => {
        try {
          const response = await api.get(`/status/${taskUid}`);
          const { status, result } = response.data;

          if (status === 'success') {
            setAnalysisResult(result);
            // setImageUrl(`/static/uploads/${taskUid}/raw.nii.gz`); // 废弃旧的单一字符串逻辑
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
  }, [step, taskUid]);

  const handleCustomRequest = async (options: any) => {
    const { file, onSuccess, onError, onProgress } = options;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setStep(1);
      const response = await api.post('/predict', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (event) => {
          const percent = Math.floor((event.loaded / (event.total || 1)) * 100);
          onProgress({ percent });
        },
      });

      setTaskUid(response.data.task_uid);
      onSuccess(response.data);
    } catch (error: any) {
      console.error('Upload failed:', error);
      onError(error);
      message.error('Upload failed. Please check backend connectivity.');
      setStep(0);
    }
  };

  const reset = () => {
    setStep(0);
    setImageUrl(null);
    setAnalysisResult(null);
    setTaskUid(null);
  };

  return (
    <div className="h-[calc(100vh-140px)]">
      {step === 0 && (
        <div className="h-full flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="max-w-xl w-full text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center mb-6">
              <Inbox size={32} className="text-sky-500" />
            </div>
            <Title level={3} className="clinical-heading !mb-2">Upload Medical Imaging</Title>
            <Text className="text-slate-400 block mb-8">
              Support for .nii.gz, .nii, and DICOM series. Max file size: 500MB.
            </Text>
            
            <div className="w-full px-4">
              <Dragger
                name="file"
                multiple={false}
                showUploadList={false}
                customRequest={handleCustomRequest}
                style={{ borderRadius: '12px' }}
                className="bg-slate-50/50 hover:bg-slate-50 transition-all border-sky-200 hover:border-sky-400"
              >
                <div className="py-10">
                  <p className="ant-upload-drag-icon flex justify-center !mb-4">
                    <FileText size={40} className="text-sky-400" />
                  </p>
                  <p className="text-base font-medium text-slate-700">Click or drag file to this area</p>
                  <p className="text-slate-400 text-sm">TotalSpineSeg AI will automatically begin segmentation</p>
                </div>
              </Dragger>
            </div>
          </div>
        </div>
      )}

      {(step === 1 || step === 2) && (
        <div className="grid grid-cols-12 gap-6 h-full">
          <div className="col-span-8 relative rounded-2xl overflow-hidden bg-black shadow-lg">
            {step === 1 && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white">
                <Spin size="large" />
                <div className="mt-6 flex flex-col items-center">
                  <Activity className="animate-pulse text-sky-400 mb-2" size={32} />
                  <Title level={4} style={{ color: 'white', margin: 0 }}>AI Model Inferencing...</Title>
                  <Text className="text-slate-400">Analyzing vertebral structures and pathology</Text>
                </div>
              </div>
            )}
            <NiivueViewer volumes={analysisResult?.vis_3d} />
          </div>

          <div className="col-span-4 flex flex-col gap-4">
            {step === 1 ? (
              <div className="bg-white rounded-xl p-8 border border-slate-100 flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <RefreshCw className="text-slate-300 animate-spin" size={24} />
                </div>
                <Text className="text-slate-400 text-lg font-medium">Processing Task...</Text>
                <Text className="text-slate-300 text-sm mt-1">Status: {taskUid ? 'In Queue' : 'Uploading'}</Text>
              </div>
            ) : (
              <ResultPanel data={analysisResult} />
            )}
            
            {step === 2 && (
              <Button 
                icon={<RefreshCw size={16} />} 
                onClick={reset}
                className="h-12 rounded-xl flex items-center justify-center gap-2 text-slate-500 border-slate-200 hover:text-sky-500 hover:border-sky-500 transition-all"
              >
                New Inference
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Inference;
