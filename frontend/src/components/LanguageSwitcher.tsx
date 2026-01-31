import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, MenuProps } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';

const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();

    const handleMenuClick: MenuProps['onClick'] = (e) => {
        i18n.changeLanguage(e.key);
    };

    const items: MenuProps['items'] = [
        {
            key: 'en',
            label: 'English',
        },
        {
            key: 'zh',
            label: '中文',
        },
    ];

    return (
        <Dropdown menu={{ items, onClick: handleMenuClick }} placement="bottomRight">
            <Button type="text" icon={<GlobalOutlined />}>
                {i18n.language === 'zh' ? '中文' : 'English'}
            </Button>
        </Dropdown>
    );
};

export default LanguageSwitcher;
