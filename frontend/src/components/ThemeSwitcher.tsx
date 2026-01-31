import React from 'react';
import { Button, Tooltip } from 'antd';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const ThemeSwitcher: React.FC = () => {
    const { isDarkMode, toggleTheme } = useTheme();
    const { t } = useTranslation();

    return (
        <Tooltip title={isDarkMode ? t('switchToLightMode') : t('switchToDarkMode')}>
            <Button
                type="text"
                onClick={toggleTheme}
                icon={isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
                style={{ color: isDarkMode ? '#A5B4FC' : '#F59E0B' }}
            >
                {isDarkMode ? t('darkMode') : t('lightMode')}
            </Button>
        </Tooltip>
    );
};

export default ThemeSwitcher;
