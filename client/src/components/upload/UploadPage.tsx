import { useState, useEffect } from 'react';
import { Typography, Card, Table, Tag } from 'antd';
import type { TableColumnsType } from 'antd';
import UploadForm from './UploadForm';
import api from '../../api/client';
import { ImportRecord } from '../../types';

const { Title } = Typography;

const columns: TableColumnsType<ImportRecord> = [
  { title: '文件名', dataIndex: 'filename', ellipsis: true },
  {
    title: '导入时间',
    dataIndex: 'uploaded_at',
    width: 180,
    render: (t: string) => t.replace('T', ' ').slice(0, 19),
  },
  { title: '记录数', dataIndex: 'row_count', width: 80, align: 'center' },
  {
    title: '状态',
    dataIndex: 'status',
    width: 80,
    render: (s: string) => (
      <Tag color={s === 'ok' ? 'green' : s === 'partial' ? 'orange' : 'red'}>
        {s === 'ok' ? '成功' : s === 'partial' ? '部分' : '失败'}
      </Tag>
    ),
  },
];

export default function UploadPage() {
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchImports = () => {
    setLoading(true);
    api.get('/upload/imports')
      .then((data: unknown) => setImports(data as ImportRecord[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchImports(); }, []);

  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>导入数据</Title>
      <Card
        title="上传钉钉OA文件"
        bordered={false}
        style={{ borderRadius: 12, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
      >
        <UploadForm />
      </Card>

      <Card
        title="导入历史"
        bordered={false}
        style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        extra={
          <a onClick={fetchImports} style={{ cursor: 'pointer' }}>刷新</a>
        }
      >
        <Table<ImportRecord>
          dataSource={imports}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>
    </div>
  );
}
