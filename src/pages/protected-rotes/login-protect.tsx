import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../helpers/hooks/useAuth";
import { Spin } from "antd";

interface ProtectProps {
  children: React.ReactNode;
}

const LoginProtect = ({ children }: ProtectProps) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  // Activating an account signs the user in. Without leaving /activate here, the page
  // remounted, checked its now-spent token again and showed "Activation Failed".
  if (isAuthenticated && user) {
    if (location.pathname === "/" || location.pathname === "/activate") {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default LoginProtect;
