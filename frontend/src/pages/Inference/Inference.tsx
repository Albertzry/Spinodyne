import React, { useState } from 'react';
import { Upload, message, Spin, Typography, Space, Button } from 'antd';
import { Inbox, FileText, Activity, CheckCircle2, RefreshCw } from 'lucide-react';
import NiivueViewer from '../../components/Medical/NiivueViewer';
import ResultPanel from '../../components/Charts/ResultPanel';
import { motion, AnimatePresence } from 'framer-motion';

const { Dragger } = Upload;
const { Title, Text } = Typography;

// Mock Data for demonstration
const MOCK_RESULT = {
  findings: [
    { title: 'Disc Herniation L4-L5', description: 'Significant posterior protrusion compressing the nerve root.', severity: 'high' },
    { title: 'Osteophyte Formation C5-C6', description: 'Minor bone growth detected on the anterior margin.', severity: 'low' }
  ],
  histogram: Array.from({ length: 20 }, (_, i) => ({ intensity: i * 50, count: Math.floor(Math.random() * 1000) })),
  angles: [
    { key: 1, name: 'Lumbar Lordosis', value: '42.5°', range: '40° - 60°' },
    { key: 2, name: 'Sacral Slope', value: '38.2°', range: '35° - 45°' }
  ],
  geometry: [
    { key: 1, name: 'L4 Vertebra', height: '24.2', diameter: '32.1' },
    { key: 2, name: 'L5 Vertebra', height: '25.8', diameter: '33.4' }
  ]
};

const Inference: React.FC = () => {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleUpload = (info: any) => {
    const { status } = info.file;
    if (status !== 'uploading') {
      console.log(info.file, info.fileList);
    }
    if (status === 'done' || status === 'error' || true) { // Simulating upload success
      setStep(1);
      // Simulate Inference process
      setTimeout(() => {
        setImageUrl('https://niivue.github.io/niivue/images/mni152.nii.gz'); // Sample NIfTI
        setStep(2);
        message.success('AI Inference completed successfully.');
      }, 2500);
    }
  };

  const reset = () => {
    setStep(0);
    setImageUrl(null);
  };

  return (
    <div className="h-[calc(100vh-140px)]">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-full flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm"
          >
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
                  onChange={handleUpload}
                  showUploadList={false}
                  customRequest={({ onSuccess }) => setTimeout(() => onSuccess?.("ok"), 500)}
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
          </motion.div>
        )}

        {(step === 1 || step === 2) && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-12 gap-6 h-full"
          >
            {/* Left: 3D Viewer */}
            <div className="col-span-8 relative rounded-2xl overflow-hidden bg-black shadow-lg">
              {step === 1 && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white">
                  <Spin size="large" />
                  <div className="mt-6 flex flex-col items-center">
                    <Activity className="animate-pulse text-sky-400 mb-2" size={32} />
                    <Text className="text-white text-lg font-medium">AI Model Inferencing...</Text>
                    <Text className="text-slate-400">Analyzing vertebral structures and pathology</Text>
                  </div>
                </div>
              )}
              <NiivueViewer imageUrl={imageUrl} />
            </div>

            {/* Right: Results Panel */}
            <div className="col-span-4 flex flex-col gap-4">
              {step === 1 ? (
                <div className="bg-white rounded-xl p-8 border border-slate-100 flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <RefreshCw className="text-slate-300 animate-spin" size={24} />
                  </div>
                  <Text className="text-slate-400">Waiting for analysis results...</Text>
                </div>
              ) : (
                <ResultPanel data={MOCK_RESULT} />
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Inference;
