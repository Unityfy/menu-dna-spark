import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
}

const RoleProtectedRoute = ({ children, allowedRoles }: RoleProtectedRouteProps) => {
  const { session, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
          <a href="/dashboard" className="text-primary hover:underline">Back to Dashboard</a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;
