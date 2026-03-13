import React, { useEffect, useState, useMemo } from 'react';
import { Typography, Table, Tag, Space, Popconfirm, message, Tooltip, Input } from 'antd';
import { Eye, Trash2, Loader2, RefreshCw, FileText, Search, ArrowRightLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import PageTransition from '../components/PageTransition';
import { motion } from 'framer-motion';
import { MotionCard, MotionButton, MotionContainer } from '../components/MotionComponents';

import { useTheme } from '../context/ThemeContext';

const { Title, Text } = Typography;

interface Task {
  id: string;
  patient_name: string;
  patient_id: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  created_at: string;
  study_date?: string;
}

const Records: React.FC = () => {
  const [data, setData] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    if (newSelectedRowKeys.length > 2) {
      message.warning(t('recordsPage.selectMaxTwo'));
      return;
    }
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const handleCompare = () => {
    if (selectedRowKeys.length !== 2) {
      message.error(t('recordsPage.selectTwoToCompare'));
      return;
    }
    const [id1, id2] = selectedRowKeys;
    // Sort by date ideally, but let's just pass them. Dashboard can sort or user can swap.
    // Actually, usually we want old -> new. 
    // Let's find the objects to check dates? 
    // For now, just navigate, clean and simple.
    navigate(`/compare/${id1}/${id2}`);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
    getCheckboxProps: (record: Task) => ({
      disabled: record.status !== 'success', // Disable comparison for non-success tasks
    }),
  };

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
          <span style={{ fontWeight: 600, color: isDarkMode ? '#F1F5F9' : '#1E293B' }}>{record.patient_name || 'N/A'}</span>
          <span style={{ fontSize: 12, color: isDarkMode ? '#94A3B8' : '#64748B' }}>{t('recordsPage.id')}: {record.patient_id}</span>
        </div>
      ),
    },
    {
      title: t('recordsPage.studyDate'),
      dataIndex: 'study_date',
      key: 'study_date',
      sorter: (a: Task, b: Task) => {
        const dateA = a.study_date ? dayjs(a.study_date).unix() : (a.created_at ? dayjs(a.created_at).unix() : 0);
        const dateB = b.study_date ? dayjs(b.study_date).unix() : (b.created_at ? dayjs(b.created_at).unix() : 0);
        return dateA - dateB;
      },
      defaultSortOrder: 'descend' as const,
      render: (date: string, record: Task) => {
        const displayDate = date || record.created_at;
        if (!displayDate) return <Text style={{ color: isDarkMode ? '#CBD5E1' : '#475569' }}>-</Text>;
        const formatStr = date ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm';
        return <Text style={{ color: isDarkMode ? '#CBD5E1' : '#475569' }}>{dayjs(displayDate).format(formatStr)}</Text>;
      },
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
            text = t('recordsPage.processing');
            icon = <Loader2 className="spin" size={14} style={{ marginRight: 6, animation: 'spin 1.5s linear infinite' }} />;
            break;
          case 'pending':
            color = 'warning';
            text = t('recordsPage.pending');
            break;
          case 'failed':
            color = 'error';
            text = t('recordsPage.failed');
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
      <MotionCard className="glass-panel" noHoverLift style={{ padding: '40px', minHeight: 'calc(100vh - 128px)' }}>
        <MotionContainer>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <Space size={12}>
              <div style={{
                width: 40,
                height: 40,
                background: isDarkMode ? 'rgba(0, 106, 254, 0.15)' : '#EFF6FF',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
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
                  padding: '7px 20px',
                  height: 'auto'
                }}
              >
                {t('recordsPage.syncData')}
              </MotionButton>
              <MotionButton
                icon={<ArrowRightLeft size={16} />}
                onClick={handleCompare}
                className="ant-btn-primary"
                type="primary"
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', // distinct green color for compare
                  borderWidth: 0,
                  borderRadius: 8,
                  fontSize: 13,
                  padding: '7px 20px',
                  height: 'auto',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                {t('recordsPage.compare', 'Compare')}
              </MotionButton>
            </Space>
          </div>

          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={filteredData}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              position: ['bottomCenter']
            }}
            onRow={(_, index) => {
              // Pass the index as a prop to the custom row component
              return { index } as any;
            }}
            style={{ background: 'transparent' }}
            className="aero-table"
            components={selectedRowKeys.length === 0 ? {
              body: {
                row: ({ children, index, ...props }: any) => {
                  // Ensure we use a valid index. Default to 0 if undefined.
                  // Use modulo 10 to reset delay for each page (pageSize is 10)
                  const safeIndex = typeof index === 'number' ? index : 0;
                  const delayIndex = safeIndex % 10;

                  return (
                    <motion.tr
                      {...props}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: delayIndex * 0.05, // Stagger effect resets every page
                        duration: 0.3,
                        ease: "easeOut"
                      }}
                      whileHover={{ scale: 1.005, backgroundColor: 'rgba(0, 106, 254, 0.02)', transition: { duration: 0.2 } }}
                      style={{ cursor: 'pointer' }}
                    >
                      {children}
                    </motion.tr>
                  );
                },
              },
            } : undefined}
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
                background: ${isDarkMode ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC'} !important;
                color: ${isDarkMode ? '#E2E8F0' : '#64748B'} !important;
                font-weight: 600 !important;
                text-transform: uppercase;
                font-size: 11px;
                letter-spacing: 0.05em;
            }
            .aero-table .ant-table-tbody > tr > td {
              border-bottom: 1px solid rgba(0,0,0,0.02) !important;
            }
            .aero-table .ant-table-tbody > tr:last-child > td {
              border-bottom: none !important;
            }
        `}</style>
          {/* Removing MotionContainer wrapper since we are animating rows individually now, or keeping it for header staggered entance */}
          {/* Actually, let's keep the MotionContainer for the header part, but the table itself handles rows. */}
        </MotionContainer>
      </MotionCard>
    </PageTransition>
  );
};

export default Records;
