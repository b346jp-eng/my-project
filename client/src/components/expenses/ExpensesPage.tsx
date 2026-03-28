import { Typography } from 'antd';
import ExpenseTable from './ExpenseTable';

const { Title } = Typography;

export default function ExpensesPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>支出管理</Title>
      <ExpenseTable />
    </div>
  );
}
