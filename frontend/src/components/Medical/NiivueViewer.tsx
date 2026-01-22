import React, { useEffect, useRef } from 'react';
import { Niivue } from '@niivue/niivue';

interface NiivueViewerProps {
  imageUrl: string | null;
}

const NiivueViewer: React.FC<NiivueViewerProps> = ({ imageUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nvRef = useRef<Niivue | null>(null);

  useEffect(() => {
    // Initialize Niivue
    if (canvasRef.current && !nvRef.current) {
      const nv = new Niivue({
        backColor: [0, 0, 0, 1], // Black background (Radiology standard)
        show3Dcrosshair: true,
        isSliceMM: true, // Multiplanar Reconstruction (MPR)
      });
      
      nv.attachToCanvas(canvasRef.current);
      nvRef.current = nv;
    }

    return () => {
      // Cleanup if needed
    };
  }, []);

  useEffect(() => {
    // Load volume when imageUrl changes
    if (nvRef.current && imageUrl) {
      const volumeList = [
        {
          url: imageUrl,
          colorMap: 'gray',
          opacity: 1,
          visible: true,
        },
      ];
      nvRef.current.loadVolumes(volumeList);
    }
  }, [imageUrl]);

  return (
    <div className="w-full h-full relative bg-black rounded-lg overflow-hidden border border-slate-800">
      <canvas ref={canvasRef} className="w-full h-full" />
      {!imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500 pointer-events-none">
          Waiting for medical imaging data...
        </div>
      )}
    </div>
  );
};

export default NiivueViewer;
