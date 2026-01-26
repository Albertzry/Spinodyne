import type { ThemeConfig } from 'antd';

const theme: ThemeConfig = {
  token: {
    colorPrimary: '#0f172a', // Deep blue accent
    colorBgLayout: '#f8fafc', // Light slate background
    borderRadius: 8,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  },
  components: {
    Layout: {
      bodyBg: '#f8fafc',
      headerBg: 'rgba(255, 255, 255, 0.7)',
      siderBg: '#ffffff',
    },
    Menu: {
      itemSelectedBg: 'rgba(15, 23, 42, 0.05)',
      itemSelectedColor: '#0f172a',
    },
  },
};

export default theme;
