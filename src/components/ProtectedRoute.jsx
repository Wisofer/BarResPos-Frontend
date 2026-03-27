import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { SessionLoader } from "./SessionLoader";

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <SessionLoader message="Cargando..." />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
