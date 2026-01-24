import React, { useEffect, useRef, useState } from 'react';
import { Niivue } from '@niivue/niivue';
import { Checkbox, Card } from 'antd';
import { Layers } from 'lucide-react';

interface NiivueViewerProps {
  volumes: {
    base: string;
    mask_structure?: string | null;
    mask_ldh?: string | null;
  } | null;
}

const NiivueViewer: React.FC<NiivueViewerProps> = ({ volumes }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nvRef = useRef<Niivue | null>(null);
  const [nvReady, setNvReady] = useState(false);
  
  // Layer visibility state
  const [layers, setLayers] = useState({
    base: true,
    structure: true,
    ldh: true,
  });

  useEffect(() => {
    if (canvasRef.current && !nvRef.current) {
      try {
        const nv = new Niivue({
          backColor: [0, 0, 0, 1], // Black background
          show3Dcrosshair: true,
          isSliceMM: true,
          trustCalMinMax: false, // Force recalculation of intensity range
        });
        
        nv.attachToCanvas(canvasRef.current);
        nvRef.current = nv;
        // nv.setSliceType(nv.sliceTypeMultiplanar); // Default to MPR view
        nv.setSliceType(nv.sliceTypeRender); // Set to 3D Render mode
        console.log('NiivueViewer: Niivue initialized and attached');
        setNvReady(true);
      } catch (err) {
        console.error('NiivueViewer: Failed to initialize Niivue', err);
      }
    }
  }, []);

  useEffect(() => {
    console.log('NiivueViewer: volumes or readiness changed', { volumes, nvReady });
    if (nvReady && nvRef.current && volumes?.base) {
      console.log('NiivueViewer: loading volumes', volumes);
      const volumeList = [];

      // 1. Base MRI (Gray)
      volumeList.push({
        url: volumes.base,
        colorMap: 'gray',
        opacity: 1,
        visible: layers.base,
      });

      // 2. Spine Structure Mask (Blue)
      if (volumes.mask_structure) {
        volumeList.push({
          url: volumes.mask_structure,
          colorMap: 'blue',
          opacity: 0.5,
          visible: layers.structure,
        });
      }

      // 3. LDH Mask (Red/Warm)
      if (volumes.mask_ldh) {
        volumeList.push({
          url: volumes.mask_ldh,
          colorMap: 'red',
          opacity: 0.6,
          visible: layers.ldh,
        });
      }

      // Load all volumes
      console.log('NiivueViewer: calling loadVolumes with', volumeList);
      nvRef.current.loadVolumes(volumeList).then(() => {
        console.log('NiivueViewer: loadVolumes completed');
      }).catch(err => {
        console.error('NiivueViewer: loadVolumes failed', err);
      });
    }
  }, [volumes, nvReady]); // Reload when volumes URL changes or Niivue is ready

  // Handle visibility toggle without reloading
  useEffect(() => {
    if (nvRef.current && nvRef.current.volumes.length > 0) {
      // Assuming the load order is maintained: 0=Base, 1=Structure, 2=LDH
      // This logic depends on the loadVolumes order above.
      
      // Update Base
      if (nvRef.current.volumes[0]) {
        nvRef.current.setOpacity(0, layers.base ? 1.0 : 0);
      }
      
      // We need to find volumes by their URL or maintain ID, 
      // but simple index mapping works if order is static.
      let idx = 1;
      if (volumes?.mask_structure) {
         if (nvRef.current.volumes[idx]) nvRef.current.setOpacity(idx, layers.structure ? 0.5 : 0);
         idx++;
      }
      if (volumes?.mask_ldh) {
         if (nvRef.current.volumes[idx]) nvRef.current.setOpacity(idx, layers.ldh ? 0.6 : 0);
      }
      
      nvRef.current.updateGLVolume();
    }
  }, [layers]);

  return (
    <div className="w-full h-full relative bg-black rounded-lg overflow-hidden border border-slate-800 group">
      <canvas ref={canvasRef} className="w-full h-full" />
      
      {!volumes?.base && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500 pointer-events-none">
          Waiting for medical imaging data...
        </div>
      )}

      {/* Floating Control Panel */}
      {volumes?.base && (
        <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Card 
            size="small" 
            title={<div className="flex items-center gap-2"><Layers size={14}/> <span className="text-xs">Layers</span></div>}
            className="w-40 shadow-lg !bg-white/90 backdrop-blur"
            styles={{ body: { padding: '8px 12px' }, header: { minHeight: '32px', padding: '0 12px' } }}
          >
            <div className="flex flex-col gap-2">
              <Checkbox 
                checked={layers.base} 
                onChange={(e) => setLayers(prev => ({ ...prev, base: e.target.checked }))}
                className="text-xs"
              >
                MRI Base
              </Checkbox>
              
              {volumes.mask_structure && (
                <Checkbox 
                  checked={layers.structure} 
                  onChange={(e) => setLayers(prev => ({ ...prev, structure: e.target.checked }))}
                  className="text-xs !ml-0 text-blue-600"
                >
                  Structure
                </Checkbox>
              )}
              
              {volumes.mask_ldh && (
                <Checkbox 
                  checked={layers.ldh} 
                  onChange={(e) => setLayers(prev => ({ ...prev, ldh: e.target.checked }))}
                  className="text-xs !ml-0 text-red-600"
                >
                  Herniation
                </Checkbox>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default NiivueViewer;
