import type { ThemeConfig } from 'antd';

const theme: ThemeConfig = {
  token: {
    colorPrimary: '#006AFE', // Aero Blue
    colorInfo: '#006AFE',
    colorBgBase: '#FFFFFF',
    colorBgLayout: '#F5F7FA',
    colorTextBase: '#475569', // Slate 600
    colorTextHeading: '#1E293B', // Slate 900
    colorTextDisabled: '#94A3B8', // Slate 400
    borderRadius: 12,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
    boxShadow: '0 4px 20px -2px rgba(0, 106, 254, 0.08)',
  },
  components: {
    Layout: {
      bodyBg: 'transparent', // Let index.css gradient show through
      headerBg: 'rgba(255, 255, 255, 0.75)',
      siderBg: 'rgba(255, 255, 255, 0.75)',
    },
    Button: {
      colorPrimary: '#006AFE',
      colorTextLightSolid: '#FFFFFF',
      algorithm: true, // Use new gradient algorithm if possible, or override via CSS
    },
    Input: {
      colorBgContainer: '#F8FAFC',
      colorBorder: '#E2E8F0',
    },
    Card: {
      boxShadowTertiary: '0 4px 20px -2px rgba(0, 106, 254, 0.08)',
    },
    Menu: {
      itemSelectedBg: '#EFF6FF',
      itemSelectedColor: '#006AFE',
      itemActiveBg: '#EFF6FF',
      activeBarBorderWidth: 3,
    },
  },
};

export default theme;
