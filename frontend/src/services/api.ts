// Configure Axios base URL
import axios from 'axios';

// 使用相对路径 '/api'，利用 Vite 的 Proxy 代理功能。
// 这样可以避免 CORS 问题，并灵活处理部署环境。
// 如果直接在代码中写死 http://10.1.3.100:25792，虽然也能工作，但通过 Proxy 更规范。
// 不过根据您的需求 "API Base URL: Must point to the public backend address"，
// 如果您希望直接请求后端（不通过代理），可以取消下面注释。
// 但由于我们配置了 proxy，直接使用 '/api' 是最佳实践。

export const API_BASE_URL = '/api'; 

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
