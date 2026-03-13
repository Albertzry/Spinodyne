import React from 'react';
import { Slider } from 'antd';
import { ALargeSmall } from 'lucide-react';
import { useTheme, FONT_SCALE_PRESETS } from '../context/ThemeContext';


const FontSizeSwitcher: React.FC = () => {
    const { fontScale, setFontScale, isDarkMode } = useTheme();

    // Map scale to slider index (0-4) for step control  
    const currentIndex = FONT_SCALE_PRESETS.findIndex(p => Math.abs(p.scale - fontScale) < 0.005);
    const sliderValue = currentIndex >= 0 ? currentIndex : 2; // default to middle

    const handleChange = (val: number) => {
        const preset = FONT_SCALE_PRESETS[val];
        if (preset) {
            setFontScale(preset.scale);
        }
    };

    const marks: Record<number, React.ReactNode> = {};
    FONT_SCALE_PRESETS.forEach((_, i) => {
        marks[i] = (
            <span style={{
                fontSize: 10 + i * 1.5,
                fontWeight: i === sliderValue ? 700 : 400,
                color: i === sliderValue ? '#006AFE' : (isDarkMode ? '#64748B' : '#94A3B8'),
                transition: 'all 0.2s'
            }}>
                A
            </span>
        );
    });

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 8px',
            width: '100%'
        }}>
            <ALargeSmall size={16} style={{ color: isDarkMode ? '#94A3B8' : '#64748B', flexShrink: 0 }} />
            <Slider
                min={0}
                max={FONT_SCALE_PRESETS.length - 1}
                step={1}
                value={sliderValue}
                onChange={handleChange}
                marks={marks}
                tooltip={{ formatter: (val) => val !== undefined ? `${Math.round(FONT_SCALE_PRESETS[val]?.scale * 100)}%` : '' }}
                style={{ flex: 1, margin: '4px 0' }}
            />
        </div>
    );
};

export default FontSizeSwitcher;
