import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { TableOutlined, ApartmentOutlined } from '@ant-design/icons';
import QuestionsPage from './pages/QuestionsPage';
import FlowBuilderPage from './pages/FlowBuilderPage';
import DashboardPage from './pages/DashboardPage';
import './App.css';

const { Header, Content } = Layout;

function App() {
  return (
    <BrowserRouter>
      <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header style={{ background: '#001529', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
          <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', marginRight: '40px', whiteSpace: 'nowrap' }}>
            WIWA Admin Panel
          </div>
          <Menu
            theme="dark"
            mode="horizontal"
            defaultSelectedKeys={['1']}
            style={{ flex: 1, minWidth: 0, justifyContent: 'flex-start' }}
          >
            <Menu.Item key="1" icon={<ApartmentOutlined />}>
              <Link to="/">Dashboard</Link>
            </Menu.Item>
            <Menu.Item key="2" icon={<TableOutlined />}>
              <Link to="/questions">Questions (Legacy)</Link>
            </Menu.Item>
          </Menu>
        </Header>
        <Content style={{ padding: 0, background: '#f0f2f5', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/questions" element={<QuestionsPage />} />
              <Route path="/flow-builder" element={<FlowBuilderPage />} />
              <Route path="/flow-builder/:id" element={<FlowBuilderPage />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
