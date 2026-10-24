import { Navigate } from 'react-router-dom';
import { useAuth } from '../../helpers/hooks/useAuth';
import { Spin } from 'antd';

/**
 * Dashboard Redirect Component
 * Automatically redirects users to the appropriate dashboard based on their role
 * - Admins and read-only viewers → /admin
 * - Regular users → /user
 */
const DashboardRedirect = () => {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(to bottom right, rgb(236, 253, 245), rgb(240, 253, 244), rgb(240, 253, 250))',
        }}
      >
        <Spin size="large" tip="Loading..." />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  // Redirect based on user role
  if (user.role === 'admin' || user.role === 'super_admin' || user.role === 'viewer') {
    return <Navigate to="/admin" replace />;
  }

  // Redirect partners to partner dashboard
  if (user.role === 'partner') {
    return <Navigate to="/partner" replace />;
  }

  // Default: redirect regular users to user dashboard
  return <Navigate to="/user" replace />;
};

export default DashboardRedirect;
