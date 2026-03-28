import { useState, useEffect } from 'react';
import {
  Typography, Table, Button, Tag, Space, Popconfirm, Modal,
  Form, Input, Select, InputNumber, Switch, message, Card
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import api from '../../api/client';

const { Title, Text } = Typography;
const { Option } = Select;

interface Rule {
  id: number;
  pattern: string;
  txn_type: string;
  category: string;
  sub_category: string | null;
  priority: number;
  is_regex: number;
}

const CATEGORIES = [
  { value: 'procurement', label: '采购/货款' },
  { value: 'salaries', label: '工资/薪酬' },
  { value: 'operations', label: '运营费用' },
  { value: 'tax', label: '税费' },
  { value: 'other_expense', label: '其他支出' },
  { value: 'collection_income', label: '回款' },
  { value: 'advance_payment', label: '预收款' },
  { value: 'other_income', label: '其他收入' },
];

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRule, setEditRule] = useState<Rule | null>(null);
  const [form] = Form.useForm();

  const fetchRules = () => {
    setLoading(true);
    api.get('/rules')
      .then((data: unknown) => setRules(data as Rule[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRules(); }, []);

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/rules/${id}`);
      message.success('规则已删除');
      fetchRules();
    } catch (err: unknown) {
      message.error((err as Error).message);
    }
  };

  const handleEdit = (rule: Rule) => {
    setEditRule(rule);
    form.setFieldsValue({ ...rule, is_regex: rule.is_regex === 1 });
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditRule(null);
    form.resetFields();
    form.setFieldsValue({ txn_type: 'any', priority: 10, is_regex: false });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editRule) {
        await api.put(`/rules/${editRule.id}`, values);
        message.success('规则已更新');
      } else {
        await api.post('/rules', values);
        message.success('规则已添加');
      }
      setModalOpen(false);
      fetchRules();
    } catch (err: unknown) {
      message.error((err as Error).message);
    }
  };

  const columns: TableColumnsType<Rule> = [
    {
      title: '关键词/正则',
      dataIndex: 'pattern',
      render: (p: string, r: Rule) => (
        <Space>
          <Text code>{p}</Text>
          {r.is_regex === 1 && <Tag color="purple">正则</Tag>}
        </Space>
      ),
    },
    {
      title: '适用类型',
      dataIndex: 'txn_type',
      width: 100,
      render: (t: string) => (
        <Tag color={t === 'expense' ? 'red' : t === 'collection' ? 'green' : 'blue'}>
          {t === 'expense' ? '支出' : t === 'collection' ? '回款' : '通用'}
        </Tag>
      ),
    },
    {
      title: '映射分类',
      dataIndex: 'category',
      render: (cat: string) => CATEGORIES.find(c => c.value === cat)?.label || cat,
    },
    { title: '子分类', dataIndex: 'sub_category', render: (v: string | null) => v || '-' },
    { title: '优先级', dataIndex: 'priority', width: 80, align: 'center' },
    {
      title: '操作',
      width: 120,
      render: (_: unknown, record: Rule) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除此规则？" onConfirm={() => handleDelete(record.id)} okText="删除" cancelText="取消">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>分类规则管理</Title>
      <Card
        bordered={false}
        style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加规则
          </Button>
        }
        title="自动分类规则"
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          系统按优先级从高到低匹配规则，第一个匹配的规则生效。内置关键词可在此修改或扩展。
        </Text>
        <Table<Rule>
          dataSource={rules}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条规则` }}
          size="small"
        />
      </Card>

      <Modal
        title={editRule ? '编辑规则' : '添加规则'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="pattern" label="关键词或正则表达式" rules={[{ required: true, message: '请输入关键词' }]}>
            <Input placeholder="例如：采购、回款、工资" />
          </Form.Item>
          <Form.Item name="txn_type" label="适用类型">
            <Select>
              <Option value="any">通用（支出+回款）</Option>
              <Option value="expense">仅支出</Option>
              <Option value="collection">仅回款</Option>
            </Select>
          </Form.Item>
          <Form.Item name="category" label="映射分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select placeholder="选择分类">
              {CATEGORIES.map(c => <Option key={c.value} value={c.value}>{c.label}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="sub_category" label="子分类（可选）">
            <Input placeholder="例如：rent、utilities" />
          </Form.Item>
          <Form.Item name="priority" label="优先级（数字越大越优先）">
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="is_regex" label="使用正则表达式" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
