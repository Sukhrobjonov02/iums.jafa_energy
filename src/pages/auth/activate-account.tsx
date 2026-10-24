import { useState, useEffect } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Space,
  Alert,
  Spin,
} from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../helpers/hooks/useAuth";
import { authService } from "../../service/auth.service";
import type { SetPasswordDto } from "../../types/auth";

const { Title, Text } = Typography;

interface UserInfo {
  email: string;
  firstName: string;
  lastName: string;
}

const ActivateAccount = () => {
  const [form] = Form.useForm();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activateAccount, isLoading } = useAuth();
  const [activationStatus, setActivationStatus] = useState<
    "loading" | "valid" | "invalid" | "success"
  >("loading");
  const [activationLink, setActivationLink] = useState<string>("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const verifyToken = async () => {
      // Get activation link from URL params
      const linkParam =
        searchParams.get("token") ||
        searchParams.get("activation_link") ||
        searchParams.get("link");

      if (!linkParam) {
        setActivationStatus("invalid");
        setErrorMessage("No activation token provided");
        return;
      }

      setActivationLink(linkParam);

      try {
        // Verify token with backend
        const response = await authService.verifyActivationToken(linkParam);

        if (response.valid && response.email) {
          setActivationStatus("valid");
          setUserInfo({
            email: response.email,
            firstName: response.firstName || "",
            lastName: response.lastName || "",
          });
        } else {
          setActivationStatus("invalid");
          setErrorMessage(
            response.message || "Invalid or expired activation token"
          );
        }
      } catch (error: any) {
        setActivationStatus("invalid");
        setErrorMessage(
          error.message ||
            "Failed to verify activation token. Please try again."
        );
      }
    };

    verifyToken();
  }, [searchParams]);

  const onFinish = async (values: {
    password: string;
    confirm_password: string;
  }) => {
    if (!activationLink) {
      return;
    }

    try {
      const activationData: SetPasswordDto = {
        activation_link: activationLink,
        password: values.password,
        confirm_password: values.confirm_password,
      };

      await activateAccount(activationData);
      setActivationStatus("success");

      // Redirect to login page after 2 seconds
      setTimeout(() => {
        navigate("/", {
          state: {
            message:
              "Account activated. Please log in.",
          },
        });
      }, 2000);
    } catch (error) {
      console.error("Account activation failed:", error);
    }
  };

  const validatePassword = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error("Please input your password!"));
    }
    if (value.length < 8) {
      return Promise.reject(
        new Error("Password must be at least 8 characters long!")
      );
    }
    if (!/(?=.*[a-z])/.test(value)) {
      return Promise.reject(
        new Error("Password must contain at least one lowercase letter!")
      );
    }
    if (!/(?=.*[A-Z])/.test(value)) {
      return Promise.reject(
        new Error("Password must contain at least one uppercase letter!")
      );
    }
    if (!/(?=.*\d)/.test(value)) {
      return Promise.reject(
        new Error("Password must contain at least one number!")
      );
    }
    if (!/(?=.*[@$!%*?&])/.test(value)) {
      return Promise.reject(
        new Error("Password must contain at least one special character!")
      );
    }
    return Promise.resolve();
  };

  const validateConfirmPassword = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error("Please confirm your password!"));
    }
    if (value !== form.getFieldValue("password")) {
      return Promise.reject(new Error("Passwords do not match!"));
    }
    return Promise.resolve();
  };

  if (activationStatus === "loading") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "#f0f2f5",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (activationStatus === "invalid") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "#f0f2f5",
        }}
      >
        <Card style={{ width: 500, textAlign: "center" }}>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <ExclamationCircleOutlined
              style={{ fontSize: 64, color: "#ff4d4f" }}
            />
            <Title level={2}>Activation Failed</Title>
            <Text type="secondary">
              {errorMessage ||
                "The activation link you used is invalid or has expired. Please contact your administrator for a new activation link."}
            </Text>
            <Button
              onClick={() => navigate("/")}
              style={{
                background: "#13c2c2",
                borderColor: "#13c2c2",
                color: "#fff",
              }}
            >
              Go to Login
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  if (activationStatus === "success") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "#f0f2f5",
        }}
      >
        <Card style={{ width: 500, textAlign: "center" }}>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <CheckCircleOutlined style={{ fontSize: 64, color: "#52c41a" }} />
            <Title level={2}>Email Verified Successfully!</Title>
            <Text
              type="secondary"
              style={{ display: "block", marginBottom: 8 }}
            >
              Your email has been verified and password has been set.
            </Text>
            <Alert
              message="Account Activation Required"
              description="An administrator must activate your account before you can log in. You will be notified once your account is activated."
              type="info"
              showIcon
              style={{ textAlign: "left", marginBottom: 16 }}
            />
            <Text type="secondary">Redirecting to login page...</Text>
            <Spin />
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#f0f2f5",
      }}
    >
      <Card style={{ width: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <Title level={2}>Set Your Password</Title>
            {userInfo && (
              <>
                <Text
                  strong
                  style={{ fontSize: 16, display: "block", marginTop: 8 }}
                >
                  Welcome {userInfo.firstName} {userInfo.lastName}!
                </Text>
                <Text
                  type="secondary"
                  style={{ display: "block", marginTop: 4 }}
                >
                  Email: {userInfo.email}
                </Text>
              </>
            )}
            <Text type="secondary" style={{ display: "block", marginTop: 12 }}>
              Set a password to activate your account.
            </Text>
          </div>

          <Alert
            message="Password Requirements"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>At least 8 characters long</li>
                <li>Contains uppercase and lowercase letters</li>
                <li>Contains at least one number</li>
                <li>Contains at least one special character (@$!%*?&)</li>
              </ul>
            }
            type="info"
            showIcon
          />

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            autoComplete="off"
          >
            <Form.Item
              label="Password"
              name="password"
              rules={[{ validator: validatePassword }]}
            >
              <Input.Password
                size="large"
                placeholder="Enter your password"
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item
              label="Confirm Password"
              name="confirm_password"
              dependencies={["password"]}
              rules={[{ validator: validateConfirmPassword }]}
            >
              <Input.Password
                size="large"
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item>
              <Button
                htmlType="submit"
                size="large"
                block
                loading={isLoading}
                style={{
                  background: "#13c2c2",
                  borderColor: "#13c2c2",
                  color: "#fff",
                }}
              >
                Activate Account
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: "center" }}>
            <Text type="secondary">
              Already have an account? <a href="/">Sign in here</a>
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default ActivateAccount;
