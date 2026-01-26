import React, { useEffect, useRef, useState } from 'react';
import { Niivue } from '@niivue/niivue';
import { Checkbox, Card, Typography, Space } from 'antd';

const { Text } = Typography;

interface NiivuePanelProps {
  rawUrl: string;
  structureMaskUrl?: string;
  ldhMaskUrl?: string;
}

const NiivuePanel: React.FC<NiivuePanelProps> = ({ rawUrl, structureMaskUrl, ldhMaskUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nvRef = useRef<Niivue | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // State for toggles
  const [showRaw, setShowRaw] = useState(true);
  const [showStructure, setShowStructure] = useState(true);
  const [showLDH, setShowLDH] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showControls, setShowControls] = useState(false);

  // Optimized opacities for 3D Volume Rendering
  const RAW_OPACITY = 1;
  const STRUCTURE_OPACITY = 0.8;
  const LDH_OPACITY = 1.0;

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Niivue with 3D Background settings
    const nv = new Niivue({
      backColor: [0, 0, 0, 1], // Strict Black background
      show3Dcrosshair: true,
      loadingText: 'Preparing 3D Volume...',
    });

    nv.attachToCanvas(canvasRef.current);
    nvRef.current = nv;

    // Prepare volumes list
    const volumes = [
      {
        url: rawUrl,
        colormap: 'gray',
        opacity: RAW_OPACITY,
        visible: true,
      }
    ];

    if (structureMaskUrl) {
      volumes.push({
        url: structureMaskUrl,
        colormap: 'batlow',
        opacity: STRUCTURE_OPACITY,
        visible: true,
      });
    }

    if (ldhMaskUrl) {
      volumes.push({
        url: ldhMaskUrl,
        colormap: 'red',
        opacity: LDH_OPACITY,
        visible: true,
      });
    }

    // Load volumes and set to 3D Render Mode
    nv.loadVolumes(volumes).then(() => {
      setIsLoaded(true);
      nv.setSliceType(nv.sliceTypeRender); // Enable 3D Volume Rendering
    });

    return () => {
        // Cleanup if needed by specific niivue version
    };
  }, [rawUrl, structureMaskUrl, ldhMaskUrl]);

  // Effect to handle visibility toggles via opacity
  useEffect(() => {
    const nv = nvRef.current;
    if (!nv || !isLoaded) return;

    let currentIdx = 0;
    
    // Raw Volume
    nv.setOpacity(currentIdx++, showRaw ? RAW_OPACITY : 0);

    // Structure Volume
    if (structureMaskUrl) {
      nv.setOpacity(currentIdx++, showStructure ? STRUCTURE_OPACITY : 0);
    }

    // LDH Volume
    if (ldhMaskUrl) {
      nv.setOpacity(currentIdx++, showLDH ? LDH_OPACITY : 0);
    }
    
    nv.drawScene();
  }, [showRaw, showStructure, showLDH, isLoaded, structureMaskUrl, ldhMaskUrl]);

  // Handle mouse hover to show/hide controls
  const handleMouseEnterControls = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setShowControls(true);
  };

  const handleMouseLeaveControls = () => {
    // 延迟隐藏，给用户一些时间
    hideTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 200);
  };

  const handleMouseEnterTrigger = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setShowControls(true);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 500, background: '#000', borderRadius: 16, overflow: 'hidden' }}>
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%', outline: 'none' }}
      />
      
      {/* 右上角触发区域 */}
      {isLoaded && (
        <div
          onMouseEnter={handleMouseEnterTrigger}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 150,
            height: 100,
            zIndex: 10,
            cursor: 'default'
          }}
        />
      )}
      
      {/* 3D Control Overlay */}
      {isLoaded && (
        <Card 
          size="small"
          variant="borderless"
          onMouseEnter={handleMouseEnterControls}
          onMouseLeave={handleMouseLeaveControls}
          style={{ 
            position: 'absolute', 
            top: 20, 
            right: 20, 
            width: 200,
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            zIndex: 11,
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: showControls ? 1 : 0,
            transform: showControls ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)',
            pointerEvents: showControls ? 'auto' : 'none'
          }}
          title={<span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>3D Controls</span>}
        >
            <Space direction="vertical" style={{ width: '100%' }} size={10}>
                <Checkbox 
                    checked={showRaw} 
                    onChange={(e) => setShowRaw(e.target.checked)}
                >
                    <Text style={{ fontSize: 13 }}>Raw MRI</Text>
                </Checkbox>
                
                {structureMaskUrl && (
                    <Checkbox 
                        checked={showStructure} 
                        onChange={(e) => setShowStructure(e.target.checked)}
                    >
                        <Text style={{ fontSize: 13 }}>Structure</Text>
                    </Checkbox>
                )}
                
                {ldhMaskUrl && (
                    <Checkbox 
                        checked={showLDH} 
                        onChange={(e) => setShowLDH(e.target.checked)}
                    >
                        <Text style={{ fontSize: 13 }}>Herniation</Text>
                    </Checkbox>
                )}
                
                <div style={{ marginTop: 8, borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 2 }}>
                   <Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic' }}>
                     * Drag to rotate volume<br/>
                     * Scroll to zoom
                   </Text>
                </div>
            </Space>
        </Card>
      )}
    </div>
  );
};

export default NiivuePanel;
