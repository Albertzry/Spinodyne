import React, { useEffect, useState } from 'react';
import { Typography, Table, Tag, Space, Button, Popconfirm, message, Tooltip, Card } from 'antd';
import { Eye, Trash2, Loader2, RefreshCw, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import PageTransition from '../components/PageTransition';

const { Title, Text } = Typography;

interface Task {
  id: string;
  patient_name: string;
  patient_id: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  created_at: string;
}

const Records: React.FC = () => {
  const [data, setData] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const result = await response.json();
      setData(Array.isArray(result) ? result : result.items || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      message.error('Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: string) => {
    try {
      let response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });

      if (response.status === 405) {
        response = await fetch(`/api/tasks/${id}/delete`, {
          method: 'POST',
        });
      }

      if (!response.ok) throw new Error('Failed to delete task');

      message.success('Record deleted successfully');
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      message.error('Failed to delete record');
    }
  };

  const columns = [
    {
      title: 'Patient Details',
      key: 'patient',
      sorter: (a: Task, b: Task) => (a.patient_name || '').localeCompare(b.patient_name || ''),
      render: (_: any, record: Task) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, color: '#1E293B' }}>{record.patient_name || 'N/A'}</span>
          <span style={{ fontSize: 12, color: '#64748B' }}>ID: {record.patient_id}</span>
        </div>
      ),
    },
    {
      title: 'Study Date',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a: Task, b: Task) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
      defaultSortOrder: 'descend' as const,
      render: (date: string) => (
        <Text style={{ color: '#475569' }}>{dayjs(date).format('YYYY-MM-DD HH:mm')}</Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      sorter: (a: Task, b: Task) => a.status.localeCompare(b.status),
      render: (status: string) => {
        let color = 'default';
        let icon = null;
        let text = status.toUpperCase();

        switch (status) {
          case 'success':
            color = 'processing';
            text = 'COMPLETED';
            break;
          case 'processing':
            color = 'processing';
            icon = <Loader2 className="spin" size={14} style={{ marginRight: 6, animation: 'spin 1.5s linear infinite' }} />;
            break;
          case 'pending':
            color = 'warning';
            break;
          case 'failed':
            color = 'error';
            break;
        }

        return (
          <Tag color={color} style={{ borderRadius: 6, padding: '2px 10px', display: 'inline-flex', alignItems: 'center', fontWeight: 500 }}>
            {icon}
            {text}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: Task) => (
        <Space size="small">
          <Tooltip title="View Detailed Result">
            <Link to={`/result/${record.id}`}>
              <Button 
                type="text" 
                shape="circle" 
                icon={<Eye size={18} />} 
                style={{ color: '#006AFE' }}
              />
            </Link>
          </Tooltip>
          
          <Popconfirm
            title="Delete this record?"
            description="All associated medical data will be purged."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button 
              type="text" 
              shape="circle" 
              danger 
              icon={<Trash2 size={18} />} 
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageTransition>
      <div className="glass-panel" style={{ padding: '40px', background: 'rgba(255, 255, 255, 0.8)', minHeight: 'calc(100vh - 128px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <Space size={12}>
                <div style={{ width: 40, height: 40, background: '#EFF6FF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={20} color="#006AFE" />
                </div>
                <Title level={2} style={{ margin: 0 }}>Patient Records</Title>
            </Space>
            <Button 
                icon={<RefreshCw size={16} />} 
                onClick={fetchTasks} 
                loading={loading}
                className="ant-btn-primary" // Apply brand gradient
                type="primary"
            >
                Sync Data
            </Button>
        </div>
        
        <Table 
            columns={columns} 
            dataSource={data} 
            rowKey="id"
            loading={loading}
            pagination={{ 
                pageSize: 10,
                showSizeChanger: false,
                position: ['bottomCenter']
            }}
            style={{ background: 'transparent' }}
            className="aero-table"
        />
        
        <style>{`
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .aero-table .ant-table {
                background: transparent !important;
            }
            .aero-table .ant-table-thead > tr > th {
                background: #F8FAFC !important;
                color: #64748B !important;
                font-weight: 600 !important;
                text-transform: uppercase;
                font-size: 11px;
                letter-spacing: 0.05em;
            }
        `}</style>
      </div>
    </PageTransition>
  );
};

export default Records;
