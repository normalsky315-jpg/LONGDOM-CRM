import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { RequireAuth } from './components/layout/RequireAuth';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Customers } from './pages/Customers';
import { CustomerDetail } from './pages/CustomerDetail';
import { SalesControl } from './pages/SalesControl';
import { Tasks } from './pages/Tasks';
import { Placeholder } from './pages/Placeholder';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/sales-control" element={<SalesControl />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/reports" element={<Placeholder title="銷售日報" />} />
          <Route path="/analytics" element={<Placeholder title="來人分析" />} />
          <Route path="/settings" element={<Placeholder title="系統管理" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
