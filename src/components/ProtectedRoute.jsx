import { Navigate } from "react-router-dom";
import { useAuth } from "../stores/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();

  // 沒登入
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
