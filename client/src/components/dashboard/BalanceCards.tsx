import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Spin, Typography } from 'antd';
import { ArrowUpOutlined, BankOutlined } from '@ant-design/icons';
import api from '../../api/client';
import { BalanceInfo } from '../../types';
import { formatCNY } from '../../utils/formatters';

const { Text } = Typography;

export default function BalanceCards() {
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<BalanceInfo>('/balance')
      .then((data: unknown) => setBalance(data as BalanceInfo))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin />;

  const cashYuan = balance ? balance.cashFen / 100 : 0;
  const payablesYuan = balance ? balance.payablesFen / 100 : 0;

  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={12}>
        <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <Statistic
            title={<span style={{ fontSize: 14, color: '#666' }}><BankOutlined /> 现金余额</span>}
            value={cashYuan}
            precision={2}
            valueStyle={{ color: cashYuan >= 0 ? '#3f8600' : '#cf1322', fontSize: 28, fontWeight: 700 }}
            prefix="¥"
            suffix={
              <Text type="secondary" style={{ fontSize: 12 }}>
                {balance?.asOf ? `  截至 ${balance.asOf}` : '  暂无数据'}
              </Text>
            }
          />
        </Card>
      </Col>
      <Col xs={24} sm={12}>
        <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <Statistic
            title={<span style={{ fontSize: 14, color: '#666' }}><ArrowUpOutlined /> 应付货款</span>}
            value={payablesYuan}
            precision={2}
            valueStyle={{ color: '#d46b08', fontSize: 28, fontWeight: 700 }}
            prefix="¥"
            suffix={
              <Text type="secondary" style={{ fontSize: 12 }}>
                {payablesYuan > 0 ? '  待支付' : '  无欠款'}
              </Text>
            }
          />
        </Card>
      </Col>
    </Row>
  );
}
