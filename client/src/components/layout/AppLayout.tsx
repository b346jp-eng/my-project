import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import SideNav from './SideNav';

const { Sider, Content } = Layout;

export default function AppLayout() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={200}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          overflow: 'auto',
        }}
      >
        <SideNav />
      </Sider>
      <Layout style={{ marginLeft: 200 }}>
        <Content
          style={{
            padding: '24px',
            minHeight: '100vh',
            background: '#f5f5f5',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
