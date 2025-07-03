import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import TasksKanban from './pages/TasksKanban';
import EditTaskPage from './pages/EditTaskPage';
import Documents from './pages/Documents';
import DocumentEditor from './pages/DocumentEditor';
import Users from './pages/Users';
import UserManagement from './pages/UserManagement';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import OrganizationDashboard from './pages/OrganizationDashboard';
import OrganizationSettings from './pages/OrganizationSettings';
import CreateOrganization from './pages/CreateOrganization';
import AllOrganizations from './pages/AllOrganizations';
import AcceptInvitation from './pages/AcceptInvitation';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import LoadingSpinner from './components/UI/LoadingSpinner';
import VerifyEmail from './pages/VerifyEmail';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <NotificationProvider>
      {!user ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/invite/:token" element={<AcceptInvitation />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/organization" element={<OrganizationDashboard />} />
            <Route path="/organization/settings" element={<OrganizationSettings />} />
            <Route path="/organization/create" element={<CreateOrganization />} />
            <Route path="/organizations" element={<AllOrganizations />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/create" element={<Teams />} />
            <Route path="/teams/:id" element={<TeamDetail />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/create" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/tasks" element={<TasksKanban />} />
            <Route path="/tasks/:id/edit" element={<EditTaskPage />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/documents/:id" element={<DocumentEditor />} />
            <Route path="/users" element={<Users />} />
            <Route path="/user-management" element={<UserManagement />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      )}
    </NotificationProvider>
  );
}

export default App;