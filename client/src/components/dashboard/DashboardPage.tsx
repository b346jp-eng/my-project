import { Row, Col, Card, Typography } from 'antd';
import BalanceCards from './BalanceCards';
import TrendChart from './TrendChart';
import ExpenseSummaryChart from './ExpenseSummaryChart';

const { Title } = Typography;

export default function DashboardPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>仪表盘</Title>
      <BalanceCards />
      <Row gutter={16}>
        <Col xs={24} lg={14}>
          <TrendChart />
        </Col>
        <Col xs={24} lg={10}>
          <ExpenseSummaryChart />
        </Col>
      </Row>
    </div>
  );
}
