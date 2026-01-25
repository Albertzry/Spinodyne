import React, { useState, useEffect } from 'react';
import { Table, Button, message, Typography, Tag, Space, Input } from 'antd';
import { Eye, Search, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search: SearchInput } = Input;

interface PatientRecord {
  id: string;
  patient_name: string;
  patient_id: string;
  study_date: string;
  status: string;
  created_at: string;
  finished_at: string | null;
}

const PatientRecords: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [searchText, setSearchText] = useState('');
  const navigate = useNavigate();

  const fetchRecords = async () => {
    setLoading(true);
    try {
      // 假设后端提供了获取所有任务的端点
      // 如果没有，我们可以先创建一个简单的端点
      const response = await api.get('/tasks');
      setRecords(response.data);
    } catch (error) {
      console.error('Failed to fetch records:', error);
      message.error('Failed to load patient records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleViewResult = (taskId: string) => {
    // 导航到结果查看页面
    navigate(`/result/${taskId}`);
  };

  const filteredRecords = records.filter(record => 
    record.patient_name.toLowerCase().includes(searchText.toLowerCase()) ||
    record.patient_id.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: 'Patient Name',
      dataIndex: 'patient_name',
      key: 'patient_name',
      width: 150,
      render: (text: string) => (
        <Text strong className="text-slate-700">{text}</Text>
      ),
    },
    {
      title: 'Patient ID',
      dataIndex: 'patient_id',
      key: 'patient_id',
      width: 120,
      render: (text: string) => (
        <Text className="text-slate-600 font-mono text-sm">{text}</Text>
      ),
    },
    {
      title: 'Study Date',
      dataIndex: 'study_date',
      key: 'study_date',
      width: 120,
      render: (date: string) => (
        <Text className="text-slate-600">
          {dayjs(date).format('YYYY-MM-DD')}
        </Text>
      ),
      sorter: (a: PatientRecord, b: PatientRecord) => 
        dayjs(a.study_date).unix() - dayjs(b.study_date).unix(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          success: 'green',
          pending: 'blue',
          processing: 'orange',
          failed: 'red',
        };
        return (
          <Tag color={colorMap[status] || 'default'}>
            {status.toUpperCase()}
          </Tag>
        );
      },
      filters: [
        { text: 'Success', value: 'success' },
        { text: 'Processing', value: 'processing' },
        { text: 'Pending', value: 'pending' },
        { text: 'Failed', value: 'failed' },
      ],
      onFilter: (value: any, record: PatientRecord) => record.status === value,
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => (
        <Text className="text-slate-500 text-sm">
          {dayjs(date).format('YYYY-MM-DD HH:mm')}
        </Text>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: PatientRecord) => (
        <Button
          type="primary"
          size="small"
          icon={<Eye size={14} />}
          onClick={() => handleViewResult(record.id)}
          disabled={record.status !== 'success'}
          className="flex items-center gap-1"
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="h-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Title level={3} className="clinical-heading !mb-1">Patient Records</Title>
          <Text className="text-slate-500">View and manage all patient analysis records</Text>
        </div>
        <Space>
          <SearchInput
            placeholder="Search by name or ID"
            allowClear
            prefix={<Search size={16} className="text-slate-400" />}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />
          <Button
            icon={<RefreshCw size={16} />}
            onClick={fetchRecords}
            loading={loading}
          >
            Refresh
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filteredRecords}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} records`,
        }}
        scroll={{ x: 900 }}
        className="clinical-table"
      />
    </div>
  );
};

export default PatientRecords;
