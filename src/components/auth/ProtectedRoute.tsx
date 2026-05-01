import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, type AppUser } from '../../context/AuthContext';

interface Props {
  children?: React.ReactNode;
  redirectTo?: string;
  allowRoles?: AppUser['role'][];
}

export function ProtectedRoute({ children, redirectTo = '/', allowRoles }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        인증 정보를 불러오는 중...
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location.pathname }} replace />;
  }

  if (allowRoles && !allowRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children ?? <Outlet />}</>;
}
