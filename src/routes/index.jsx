import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute.jsx";
import { AuthHome, Login, NotFound } from "../pages";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <AuthHome />
      </ProtectedRoute>
    ),
  },
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "*", element: <NotFound /> },
]);
