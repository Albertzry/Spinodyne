import React, { useEffect, useState, useMemo } from 'react';
import { Typography, Table, Tag, Space, Popconfirm, message, Tooltip, Input } from 'antd';
import { Eye, Trash2, Loader2, RefreshCw, FileText, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import PageTransition from '../components/PageTransition';
import { MotionCard, MotionButton, MotionContainer } from '../components/MotionComponents';

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
  const [searchText, setSearchText] = useState('');
  const { t } = useTranslation();

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const result = await response.json();
      setData(Array.isArray(result) ? result : result.items || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      message.error(t('recordsPage.loadError'));
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

      message.success(t('recordsPage.deleteSuccess'));
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      message.error(t('recordsPage.deleteError'));
    }
  };

  const columns = [
    {
      title: t('recordsPage.patientDetails'),
      key: 'patient',
      sorter: (a: Task, b: Task) => (a.patient_name || '').localeCompare(b.patient_name || ''),
      render: (_: any, record: Task) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, color: '#1E293B' }}>{record.patient_name || 'N/A'}</span>
          <span style={{ fontSize: 12, color: '#64748B' }}>{t('recordsPage.id')}: {record.patient_id}</span>
        </div>
      ),
    },
    {
      title: t('recordsPage.studyDate'),
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a: Task, b: Task) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
      defaultSortOrder: 'descend' as const,
      render: (date: string) => (
        <Text style={{ color: '#475569' }}>{dayjs(date).format('YYYY-MM-DD HH:mm')}</Text>
      ),
    },
    {
      title: t('recordsPage.status'),
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
            text = t('recordsPage.completed');
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
      title: t('recordsPage.actions'),
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: Task) => (
        <Space size="small">
          <Tooltip title={t('recordsPage.viewResult')}>
            <span style={{ display: 'inline-block' }}>
              <Link to={`/result/${record.id}`}>
                <MotionButton
                  type="text"
                  shape="circle"
                  icon={<Eye size={18} />}
                  style={{ color: '#006AFE' }}
                  motionProps={{ whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 } }}
                />
              </Link>
            </span>
          </Tooltip>

          <Popconfirm
            title={t('recordsPage.deleteConfirmTitle')}
            description={t('recordsPage.deleteConfirmDesc')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('recordsPage.delete')}
            cancelText={t('recordsPage.cancel')}
            okButtonProps={{ danger: true }}
          >
            <span style={{ display: 'inline-block' }}>
              <MotionButton
                type="text"
                shape="circle"
                danger
                icon={<Trash2 size={18} />}
                motionProps={{ whileHover: { scale: 1.1, color: '#ef4444' }, whileTap: { scale: 0.9 } }}
              />
            </span>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Filter data based on search text
  const filteredData = useMemo(() => {
    if (!searchText.trim()) {
      return data;
    }
    const searchLower = searchText.toLowerCase().trim();
    return data.filter((task) => {
      const nameMatch = (task.patient_name || '').toLowerCase().includes(searchLower);
      const idMatch = (task.patient_id || '').toLowerCase().includes(searchLower);
      return nameMatch || idMatch;
    });
  }, [data, searchText]);

  return (
    <PageTransition>
      <MotionCard className="glass-panel" noHoverLift style={{ padding: '40px', background: 'rgba(255, 255, 255, 0.8)', minHeight: 'calc(100vh - 128px)' }}>
        <MotionContainer>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <Space size={12}>
              <div style={{ width: 40, height: 40, background: '#EFF6FF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={20} color="#006AFE" />
              </div>
              <Title level={2} style={{ margin: 0 }}>{t('recordsPage.title')}</Title>
            </Space>
            <Space size={12}>
              <Input
                placeholder={t('recordsPage.searchPlaceholder')}
                prefix={<Search size={16} style={{ color: '#94a3b8' }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                style={{
                  width: 280,
                  borderRadius: 8
                }}
              />
              <MotionButton
                icon={<RefreshCw size={16} />}
                onClick={fetchTasks}
                loading={loading}
                className="ant-btn-primary" // Apply brand gradient
                type="primary"
                style={{
                  borderWidth: 2,
                  borderStyle: 'solid',
                  borderColor: 'rgba(0, 106, 254, 0.2)',
                  borderRadius: 8,
                  fontSize: 13,
                  padding: '4px 20px',
                  height: 'auto'
                }}
              >
                {t('recordsPage.syncData')}
              </MotionButton>
            </Space>
          </div>

          <Table
            columns={columns}
            dataSource={filteredData}
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
        </MotionContainer>
      </MotionCard>
    </PageTransition>
  );
};

export default Records;
