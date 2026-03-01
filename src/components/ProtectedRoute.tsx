import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // TODO: Re-enable auth check before production
  return <>{children}</>;
};

export default ProtectedRoute;
