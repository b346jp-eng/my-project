import { useState } from 'react';
import {
  Upload, Button, Table, Alert, Space, Typography, Tag, Divider, Spin, message
} from 'antd';
import { InboxOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { UploadFile, RcFile } from 'antd/es/upload/interface';
import type { TableColumnsType } from 'antd';
import api from '../../api/client';
import { PreviewRow, ParseError } from '../../types';
import { formatCNY, CATEGORY_LABELS, CATEGORY_COLORS } from '../../utils/formatters';

const { Dragger } = Upload;
const { Title, Text } = Typography;

interface PreviewData {
  total_rows: number;
  error_count: number;
  preview: PreviewRow[];
  errors: ParseError[];
}

export default function UploadForm() {
  const [file, setFile] = useState<RcFile | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ row_count: number; error_count: number } | null>(null);

  const previewColumns: TableColumnsType<PreviewRow> = [
    { title: '日期', dataIndex: 'txn_date', width: 110 },
    {
      title: '类型',
      dataIndex: 'txn_type',
      width: 80,
      render: (t: string) => (
        <Tag color={t === 'collection' ? 'green' : 'red'}>
          {t === 'collection' ? '回款' : '支出'}
        </Tag>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 120,
      render: (cat: string, rec: PreviewRow) => (
        <Space size={2}>
          <Tag color={CATEGORY_COLORS[cat] || 'default'} style={{ borderRadius: 6 }}>
            {CATEGORY_LABELS[cat] || cat}
          </Tag>
          {rec.auto_categorized && <Tag color="warning" style={{ fontSize: 10 }}>待确认</Tag>}
        </Space>
      ),
    },
    { title: '摘要', dataIndex: 'description', ellipsis: true },
    { title: '对方单位', dataIndex: 'counterparty', width: 130, ellipsis: true },
    {
      title: '金额',
      dataIndex: 'amount_fen',
      align: 'right',
      width: 130,
      render: (fen: number, rec: PreviewRow) => (
        <span style={{ color: rec.txn_type === 'collection' ? '#389e0d' : '#cf1322', fontWeight: 600 }}>
          {rec.txn_type === 'collection' ? '+' : '-'}{formatCNY(fen)}
        </span>
      ),
    },
  ];

  const handlePreview = async (f: RcFile) => {
    setFile(f);
    setPreview(null);
    setImportResult(null);
    setPreviewLoading(true);
    const formData = new FormData();
    formData.append('file', f);
    try {
      const data = await api.post('/upload/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data as unknown as PreviewData);
    } catch (err: unknown) {
      message.error((err as Error).message || '预览失败');
    } finally {
      setPreviewLoading(false);
    }
    return false; // prevent auto upload
  };

  const handleConfirm = async () => {
    if (!file) return;
    setConfirmLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const data = await api.post('/upload/confirm', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = data as unknown as { row_count: number; error_count: number };
      setImportResult(result);
      setPreview(null);
      setFile(null);
      message.success(`成功导入 ${result.row_count} 条记录`);
    } catch (err: unknown) {
      message.error((err as Error).message || '导入失败');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setPreview(null);
  };

  return (
    <div>
      {!preview && !importResult && (
        <Dragger
          accept=".xlsx,.xls,.csv"
          showUploadList={false}
          beforeUpload={handlePreview}
          fileList={[] as UploadFile[]}
          style={{ padding: '20px 0', borderRadius: 12 }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ color: '#1677ff', fontSize: 48 }} />
          </p>
          <p style={{ fontSize: 16, fontWeight: 500 }}>点击或拖拽钉钉OA导出文件到此处</p>
          <p style={{ color: '#888' }}>支持 .xlsx、.xls 格式，最大 10MB</p>
          <p style={{ color: '#888', fontSize: 12 }}>系统将自动识别列名并完成分类</p>
        </Dragger>
      )}

      {previewLoading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <p style={{ marginTop: 12, color: '#666' }}>正在解析文件...</p>
        </div>
      )}

      {preview && (
        <div>
          <Alert
            message={
              <span>
                解析完成：共 <strong>{preview.total_rows}</strong> 条有效记录
                {preview.error_count > 0 && (
                  <span style={{ color: '#faad14' }}>，{preview.error_count} 条解析失败</span>
                )}
                （预览前 10 条）
              </span>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Title level={5} style={{ marginBottom: 8 }}>数据预览</Title>
          <Table<PreviewRow>
            dataSource={preview.preview}
            columns={previewColumns}
            rowKey={(_, i) => String(i)}
            pagination={false}
            size="small"
            style={{ marginBottom: 16 }}
          />

          {preview.errors.length > 0 && (
            <>
              <Divider />
              <Title level={5} style={{ color: '#faad14' }}>解析失败行（最多显示20条）</Title>
              {preview.errors.map((e, i) => (
                <Alert
                  key={i}
                  message={`第 ${e.row_index} 行: ${e.reason}`}
                  type="warning"
                  style={{ marginBottom: 4 }}
                />
              ))}
            </>
          )}

          <Divider />
          <Space>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleConfirm}
              loading={confirmLoading}
              size="large"
            >
              确认导入 {preview.total_rows} 条
            </Button>
            <Button
              icon={<CloseCircleOutlined />}
              onClick={handleCancel}
              size="large"
            >
              取消
            </Button>
          </Space>
        </div>
      )}

      {importResult && (
        <Alert
          message="导入成功"
          description={
            <div>
              <p>成功导入 <strong>{importResult.row_count}</strong> 条记录</p>
              {importResult.error_count > 0 && (
                <p><Text type="warning">{importResult.error_count} 条数据解析失败（已跳过）</Text></p>
              )}
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={() => setImportResult(null)}
              >
                继续导入其他文件
              </Button>
            </div>
          }
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
        />
      )}
    </div>
  );
}
