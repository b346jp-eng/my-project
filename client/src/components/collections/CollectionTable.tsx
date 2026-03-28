import { useState, useEffect, useCallback } from 'react';
import { Table, Tag, DatePicker, Select, Radio, Space, Badge, Tooltip, Spin } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import api from '../../api/client';
import { GroupedRow, LineItem, GroupBy } from '../../types';
import { formatCNY, formatPeriod, CATEGORY_LABELS, CATEGORY_COLORS } from '../../utils/formatters';

const { RangePicker } = DatePicker;
const { Option } = Select;

const COLLECTION_CATEGORIES = [
  { value: 'collection_income', label: '回款' },
  { value: 'advance_payment', label: '预收款' },
  { value: 'other_income', label: '其他收入' },
];

export default function CollectionTable() {
  const [rows, setRows] = useState<GroupedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [category, setCategory] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);
  const [expandedItems, setExpandedItems] = useState<Map<string, LineItem[]>>(new Map());
  const [expandLoading, setExpandLoading] = useState<Set<string>>(new Set());

  const fetchData = useCallback(() => {
    setLoading(true);
    api.get('/collections', {
      params: {
        from: dateRange[0].format('YYYY-MM-DD'),
        to: dateRange[1].format('YYYY-MM-DD'),
        groupBy,
        ...(category ? { category } : {}),
      },
    })
      .then((data: unknown) => setRows(data as GroupedRow[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dateRange, groupBy, category]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadItems = useCallback((groupKey: string) => {
    if (expandedItems.has(groupKey)) return;
    setExpandLoading(prev => new Set(prev).add(groupKey));
    api.get('/collections/items', { params: { groupKey } })
      .then((data: unknown) => {
        setExpandedItems(prev => new Map(prev).set(groupKey, data as LineItem[]));
      })
      .catch(console.error)
      .finally(() => {
        setExpandLoading(prev => {
          const next = new Set(prev);
          next.delete(groupKey);
          return next;
        });
      });
  }, [expandedItems]);

  const columns: TableColumnsType<GroupedRow> = [
    {
      title: '日期/周期',
      dataIndex: 'group_key',
      key: 'period',
      width: 130,
      render: (gk: string) => <span style={{ fontWeight: 500 }}>{formatPeriod(gk)}</span>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 130,
      render: (cat: string) => (
        <Tag color={CATEGORY_COLORS[cat] || 'blue'} style={{ borderRadius: 6 }}>
          {CATEGORY_LABELS[cat] || cat}
        </Tag>
      ),
    },
    {
      title: '笔数',
      dataIndex: 'count',
      key: 'count',
      width: 80,
      align: 'center',
    },
    {
      title: '合计金额',
      dataIndex: 'total_fen',
      key: 'total_fen',
      align: 'right',
      render: (fen: number) => (
        <span style={{ fontWeight: 700, color: '#389e0d', fontSize: 15 }}>
          {formatCNY(fen)}
        </span>
      ),
    },
  ];

  const innerColumns: TableColumnsType<LineItem> = [
    { title: '日期', dataIndex: 'txn_date', key: 'date', width: 110 },
    {
      title: '摘要',
      dataIndex: 'description',
      key: 'desc',
      render: (text: string, record: LineItem) => (
        <Space>
          {text}
          {record.auto_categorized && (
            <Tooltip title="自动分类，建议确认">
              <Badge status="warning" />
              <InfoCircleOutlined style={{ color: '#faad14', fontSize: 12 }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    { title: '对方单位', dataIndex: 'counterparty', key: 'counterparty', width: 140 },
    { title: '单据号', dataIndex: 'reference_no', key: 'ref', width: 130 },
    {
      title: '金额',
      dataIndex: 'amount_fen',
      key: 'amount',
      align: 'right',
      width: 130,
      render: (fen: number) => <span style={{ color: '#389e0d' }}>{formatCNY(fen)}</span>,
    },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 16 }}>
        <RangePicker
          value={dateRange}
          onChange={v => { if (v?.[0] && v?.[1]) setDateRange([v[0], v[1]]); }}
          format="YYYY-MM-DD"
          allowClear={false}
        />
        <Select
          placeholder="全部分类"
          allowClear
          style={{ width: 150 }}
          onChange={v => setCategory(v)}
        >
          {COLLECTION_CATEGORIES.map(c => (
            <Option key={c.value} value={c.value}>{c.label}</Option>
          ))}
        </Select>
        <Radio.Group
          value={groupBy}
          onChange={e => setGroupBy(e.target.value)}
          optionType="button"
          buttonStyle="solid"
          options={[
            { label: '按日', value: 'day' },
            { label: '按周', value: 'week' },
            { label: '按月', value: 'month' },
          ]}
        />
      </Space>

      <Table<GroupedRow>
        dataSource={rows}
        columns={columns}
        rowKey="group_key"
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `共 ${t} 条` }}
        expandable={{
          expandedRowRender: (record) => {
            const items = expandedItems.get(record.group_key);
            if (expandLoading.has(record.group_key)) {
              return <div style={{ padding: '20px', textAlign: 'center' }}><Spin /></div>;
            }
            return (
              <Table<LineItem>
                dataSource={items || []}
                columns={innerColumns}
                rowKey="id"
                pagination={false}
                size="small"
                style={{ margin: '0 8px' }}
              />
            );
          },
          onExpand: (expanded, record) => {
            if (expanded) loadItems(record.group_key);
          },
          rowExpandable: () => true,
        }}
        summary={(data) => {
          const total = data.reduce((sum, r) => sum + r.total_fen, 0);
          return (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3}>
                <strong>合计</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                <strong style={{ color: '#389e0d' }}>{formatCNY(total)}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          );
        }}
      />
    </div>
  );
}
