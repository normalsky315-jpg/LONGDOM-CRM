import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { RequireAuth } from './components/layout/RequireAuth';
import { ToastProvider } from './components/ui/Toast';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Customers } from './pages/Customers';
import { CustomerDetail } from './pages/CustomerDetail';
import { NewCustomer } from './pages/NewCustomer';
import { SalesControl } from './pages/SalesControl';
import { Tasks } from './pages/Tasks';
import { DailyReport } from './pages/DailyReport';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <ToastProvider>
      <HashRouter>
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
            <Route path="/customers/new" element={<NewCustomer />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
            <Route path="/sales-control" element={<SalesControl />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/reports" element={<DailyReport />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </HashRouter>
    </ToastProvider>
  );
}
