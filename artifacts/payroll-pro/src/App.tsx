import { AppLayout } from "./components/layout/AppLayout";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";

// Pages
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import Dashboard from "@/pages/dashboard/Dashboard";
import VerifyDocument from "@/pages/verify/VerifyDocument";

import CompanyList from "@/pages/companies/CompanyList";
import CompanyForm from "@/pages/companies/CompanyForm";
import CompanyDetail from "@/pages/companies/CompanyDetail";

import EmployeeList from "@/pages/employees/EmployeeList";
import EmployeeForm from "@/pages/employees/EmployeeForm";
import EmployeeDetail from "@/pages/employees/EmployeeDetail";

import PayslipList from "@/pages/payslips/PayslipList";
import PayslipForm from "@/pages/payslips/PayslipForm";
import PayslipDetail from "@/pages/payslips/PayslipDetail";

import InvoiceList from "@/pages/invoices/InvoiceList";
import InvoiceForm from "@/pages/invoices/InvoiceForm";
import InvoiceDetail from "@/pages/invoices/InvoiceDetail";

import AuditLogsList from "@/pages/audit-logs/AuditLogsList";
import Settings from "@/pages/settings/Settings";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return null; // Let AppLayout handle the loading state
  if (!user) return <Redirect to="/login" />;
  
  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/verify/:token" component={VerifyDocument} />

      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>

      <Route path="/dashboard">
        {() => (
          <AppLayout>
            <ProtectedRoute component={Dashboard} />
          </AppLayout>
        )}
      </Route>

      {/* Companies */}
      <Route path="/companies">
        {() => (
          <AppLayout>
            <ProtectedRoute component={CompanyList} />
          </AppLayout>
        )}
      </Route>
      <Route path="/companies/new">
        {() => (
          <AppLayout>
            <ProtectedRoute component={CompanyForm} />
          </AppLayout>
        )}
      </Route>
      <Route path="/companies/:id/edit">
        {() => (
          <AppLayout>
            <ProtectedRoute component={CompanyForm} />
          </AppLayout>
        )}
      </Route>
      <Route path="/companies/:id">
        {() => (
          <AppLayout>
            <ProtectedRoute component={CompanyDetail} />
          </AppLayout>
        )}
      </Route>

      {/* Employees */}
      <Route path="/employees">
        {() => (
          <AppLayout>
            <ProtectedRoute component={EmployeeList} />
          </AppLayout>
        )}
      </Route>
      <Route path="/employees/new">
        {() => (
          <AppLayout>
            <ProtectedRoute component={EmployeeForm} />
          </AppLayout>
        )}
      </Route>
      <Route path="/employees/:id/edit">
        {() => (
          <AppLayout>
            <ProtectedRoute component={EmployeeForm} />
          </AppLayout>
        )}
      </Route>
      <Route path="/employees/:id">
        {() => (
          <AppLayout>
            <ProtectedRoute component={EmployeeDetail} />
          </AppLayout>
        )}
      </Route>

      {/* Payslips */}
      <Route path="/payslips">
        {() => (
          <AppLayout>
            <ProtectedRoute component={PayslipList} />
          </AppLayout>
        )}
      </Route>
      <Route path="/payslips/new">
        {() => (
          <AppLayout>
            <ProtectedRoute component={PayslipForm} />
          </AppLayout>
        )}
      </Route>
      <Route path="/payslips/:id">
        {() => (
          <AppLayout>
            <ProtectedRoute component={PayslipDetail} />
          </AppLayout>
        )}
      </Route>

      {/* Invoices */}
      <Route path="/invoices">
        {() => (
          <AppLayout>
            <ProtectedRoute component={InvoiceList} />
          </AppLayout>
        )}
      </Route>
      <Route path="/invoices/new">
        {() => (
          <AppLayout>
            <ProtectedRoute component={InvoiceForm} />
          </AppLayout>
        )}
      </Route>
      <Route path="/invoices/:id">
        {() => (
          <AppLayout>
            <ProtectedRoute component={InvoiceDetail} />
          </AppLayout>
        )}
      </Route>

      {/* Misc */}
      <Route path="/audit-logs">
        {() => (
          <AppLayout>
            <ProtectedRoute component={AuditLogsList} />
          </AppLayout>
        )}
      </Route>
      <Route path="/settings">
        {() => (
          <AppLayout>
            <ProtectedRoute component={Settings} />
          </AppLayout>
        )}
      </Route>

      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
