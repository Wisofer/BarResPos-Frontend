import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { SessionLoader } from "./SessionLoader";

export function ProtectedRoute({ children }) {
  const { user, loading, sessionLoading } = useAuth();
  const location = useLocation();

  if (loading) return <SessionLoader message="Cargando..." />;
  if (sessionLoading) return <SessionLoader message={user ? "Cerrando sesión..." : "Procesando sesión..."} />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
