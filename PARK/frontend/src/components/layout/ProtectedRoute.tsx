/**
 * PARK — Route Guard
 */
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

interface Props {
  children: React.ReactNode;
  roles?: Array<"student" | "supervisor" | "coordinator" | "admin">;
}

export function ProtectedRoute({ children, roles }: Props) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/pairings" replace />;
  }

  return <>{children}</>;
}
