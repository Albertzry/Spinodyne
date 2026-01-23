import React from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const navigate = useNavigate();

  const onFinish = (values: any) => {
    console.log('Success:', values);
    // Mock login logic
    localStorage.setItem('token', 'mock-spinodyne-token');
    message.success('Login successful');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-sky-500 to-indigo-600">
      <div>
        <Card
          className="w-[400px] shadow-2xl border-none rounded-2xl overflow-hidden"
          styles={{ body: { padding: '40px' } }}
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="text-sky-600" size={32} />
            </div>
            <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>
              Spinodyne
            </Title>
            <Text className="text-slate-400 mt-1">Medical AI Deployment Platform</Text>
          </div>

          <Form
            name="login"
            layout="vertical"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Please enter your username' }]}
            >
              <Input 
                prefix={<User size={18} className="text-slate-400" />} 
                placeholder="Username" 
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                prefix={<Lock size={18} className="text-slate-400" />}
                placeholder="Password"
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item className="mt-8">
              <Button
                type="primary"
                htmlType="submit"
                block
                className="h-12 bg-sky-500 hover:bg-sky-600 border-none rounded-lg font-semibold text-lg"
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <div className="text-center mt-6">
            <Text className="text-slate-400 text-sm">
              Authorized personnel only. Secure terminal.
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
