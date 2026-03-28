import { Typography } from 'antd';
import CollectionTable from './CollectionTable';

const { Title } = Typography;

export default function CollectionsPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>回款管理</Title>
      <CollectionTable />
    </div>
  );
}
