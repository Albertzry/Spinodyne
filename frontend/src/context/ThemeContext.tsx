import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

// Font scale presets: a safe range that won't break layouts
export const FONT_SCALE_PRESETS = [
    { key: 'xs', label: 'A-', scale: 0.86 },
    { key: 'sm', label: 'A',  scale: 0.93 },
    { key: 'md', label: 'A',  scale: 1.00 },
    { key: 'lg', label: 'A',  scale: 1.07 },
    { key: 'xl', label: 'A+', scale: 1.14 },
];

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    isDarkMode: boolean;
    fontScale: number;
    setFontScale: (scale: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('theme');
        return (savedTheme as Theme) || 'light';
    });

    const [fontScale, setFontScaleState] = useState<number>(() => {
        const saved = localStorage.getItem('fontScale');
        const parsed = saved ? parseFloat(saved) : 1.0;
        return (parsed >= 0.86 && parsed <= 1.14) ? parsed : 1.0;
    });

    useEffect(() => {
        localStorage.setItem('theme', theme);
        const root = document.documentElement;
        if (theme === 'dark') {
            root.setAttribute('data-theme', 'dark');
            root.classList.add('dark');
        } else {
            root.setAttribute('data-theme', 'light');
            root.classList.remove('dark');
        }
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('fontScale', String(fontScale));
        document.documentElement.style.fontSize = `${fontScale * 100}%`;
    }, [fontScale]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    const setFontScale = (scale: number) => {
        // Clamp to safe range
        const clamped = Math.max(0.86, Math.min(1.14, scale));
        setFontScaleState(clamped);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, isDarkMode: theme === 'dark', fontScale, setFontScale }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
