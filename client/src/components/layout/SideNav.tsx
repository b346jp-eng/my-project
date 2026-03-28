import { Menu } from 'antd';
import {
  DashboardOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  UploadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/expenses', icon: <ArrowDownOutlined style={{ color: '#ff4d4f' }} />, label: '支出管理' },
  { key: '/collections', icon: <ArrowUpOutlined style={{ color: '#52c41a' }} />, label: '回款管理' },
  { key: '/upload', icon: <UploadOutlined />, label: '导入数据' },
  { key: '/rules', icon: <SettingOutlined />, label: '分类规则' },
];

export default function SideNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        marginBottom: 8,
      }}>
        <span style={{ color: '#fff', fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>
          💰 资金管理
        </span>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{ flex: 1, borderRight: 0 }}
      />
    </div>
  );
}
