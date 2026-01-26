import React, { useEffect, useState } from 'react';
import { Typography, Table, Tag, Space, Button, Popconfirm, message, Tooltip } from 'antd';
import { Eye, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import PageTransition from '../components/PageTransition';

const { Title } = Typography;

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
    
    // Optional: Auto-refresh every 30 seconds to update statuses
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
      fetchTasks(); // Refresh list
    } catch (error) {
      console.error('Error deleting task:', error);
      message.error('Failed to delete record');
    }
  };

  const columns = [
    {
      title: 'Patient',
      key: 'patient',
      sorter: (a: Task, b: Task) => (a.patient_name || '').localeCompare(b.patient_name || ''),
      render: (_: any, record: Task) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 500, color: '#0f172a' }}>{record.patient_name || 'N/A'}</span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{record.patient_id}</span>
        </div>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a: Task, b: Task) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
      defaultSortOrder: 'descend' as const,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
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
            color = 'success';
            text = 'COMPLETED';
            break;
          case 'processing':
            color = 'processing';
            icon = <Loader2 className="spin" size={14} style={{ marginRight: 4, animation: 'spin 1s linear infinite' }} />;
            break;
          case 'pending':
            color = 'warning';
            break;
          case 'failed':
            color = 'error';
            break;
        }

        return (
          <Tag color={color} style={{ display: 'flex', alignItems: 'center', width: 'fit-content' }}>
            {icon}
            {text}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Task) => (
        <Space size="middle">
          <Tooltip title="View Result">
            <Link to={`/result/${record.id}`}>
              <Button 
                type="text" 
                shape="circle" 
                icon={<Eye size={18} />} 
                style={{ color: '#0f172a' }}
              />
            </Link>
          </Tooltip>
          
          <Popconfirm
            title="Delete this record?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
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
      <div className="glass-panel" style={{ padding: 40, borderRadius: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Title level={2} style={{ margin: 0, color: '#0f172a' }}>Patient Records</Title>
            <Button 
                icon={<RefreshCw size={16} />} 
                onClick={fetchTasks} 
                loading={loading}
            >
                Refresh
            </Button>
        </div>
        
        <Table 
            columns={columns} 
            dataSource={data} 
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 8 }}
            style={{ flex: 1 }}
        />
        
        <style>{`
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `}</style>
      </div>
    </PageTransition>
  );
};

export default Records;
