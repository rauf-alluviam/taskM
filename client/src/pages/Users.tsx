import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Users: React.FC = () => {
  const { user } = useAuth();

  // Redirect to UserManagement page for role-based user management
  if (user) {
    return <Navigate to="/user-management" replace />;
  }

  // If no user, redirect to login
  return <Navigate to="/login" replace />;
};

export default Users;
