import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Typography,
  Card,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MailOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { authService } from '../../../service/auth.service';
import type { UserResponseDto, CreateUserDto, UpdateUserDto } from '../../../types/auth';

const { Title } = Typography;
const { Option } = Select;

interface UserModalProps {
  visible: boolean;
  user?: UserResponseDto;
  onCancel: () => void;
  onSuccess: () => void;
}

const UserModal: React.FC<UserModalProps> = ({ visible, user, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const isEdit = !!user;

  useEffect(() => {
    if (visible) {
      if (isEdit && user) {
        form.setFieldsValue({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          phone: user.phone,
          company: user.company,
          position: user.position,
          department: user.department,
          canManageUsers: user.canManageUsers,
          canViewAnalytics: user.canViewAnalytics,
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, isEdit, user, form]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      if (isEdit && user) {
        const updateData: UpdateUserDto = {
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          company: values.company,
          position: values.position,
          department: values.department,
          role: values.role,
          canManageUsers: values.canManageUsers,
          canViewAnalytics: values.canViewAnalytics,
        };
        await authService.updateUser(user.id, updateData);
        message.success('User updated successfully');
      } else {
        const createData: CreateUserDto = {
          email: values.email,
          password: 'TempPassword123!', // Temporary password, user will set their own during activation
          firstName: values.firstName,
          lastName: values.lastName,
          role: values.role,
          phone: values.phone,
          company: values.company,
          position: values.position,
          department: values.department,
          canManageUsers: values.canManageUsers || false,
          canViewAnalytics: values.canViewAnalytics || false,
        };
        await authService.register(createData);
        message.success('User created successfully. Activation email sent.');
      }
      onSuccess();
      onCancel();
    } catch (error: any) {
      message.error(error.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit User' : 'Create New User'}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        {!isEdit && (
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter valid email' }
            ]}
          >
            <Input />
          </Form.Item>
        )}

        <Form.Item
          label="First Name"
          name="firstName"
          rules={[{ required: true, message: 'Please enter first name' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Last Name"
          name="lastName"
          rules={[{ required: true, message: 'Please enter last name' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Role"
          name="role"
          rules={[{ required: true, message: 'Please select role' }]}
        >
          <Select>
            <Option value="user">User</Option>
            <Option value="partner">Partner</Option>
            <Option value="operator">Operator</Option>
            <Option value="viewer">Viewer (faqat ko'rish)</Option>
            <Option value="admin">Admin</Option>
          </Select>
        </Form.Item>

        <Form.Item label="Phone" name="phone">
          <Input />
        </Form.Item>

        <Form.Item label="Company" name="company">
          <Input />
        </Form.Item>

        <Form.Item label="Position" name="position">
          <Input />
        </Form.Item>

        <Form.Item label="Department" name="department">
          <Input />
        </Form.Item>

        <Form.Item
          label="Can Manage Users"
          name="canManageUsers"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          label="Can View Analytics"
          name="canViewAnalytics"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isEdit ? 'Update' : 'Create'}
            </Button>
            <Button onClick={onCancel}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResponseDto | undefined>();
  const [resendingActivation, setResendingActivation] = useState<number | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await authService.getAllUsers();
      setUsers(response);
    } catch (error: any) {
      message.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await authService.deleteUser(id);
      message.success('User deleted successfully');
      fetchUsers();
    } catch (error: any) {
      message.error('Failed to delete user');
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await authService.toggleUserStatus(id);
      message.success('User status updated');
      fetchUsers();
    } catch (error: any) {
      message.error('Failed to update user status');
    }
  };

  const handleResendActivation = async (id: number) => {
    try {
      setResendingActivation(id);
      await authService.resendActivationEmail(id);
      message.success('Activation email sent successfully');
    } catch (error: any) {
      console.error('Activation email error:', error);
      const errorMessage = error?.message || 'Failed to send activation email';
      message.error(`Failed to send activation email: ${errorMessage}`);
    } finally {
      setResendingActivation(null);
    }
  };

  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (record: UserResponseDto) => (
        <Space>
          <UserOutlined />
          {record.firstName} {record.lastName}
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const colorMap: Record<string, string> = {
          super_admin: 'red',
          admin: 'red',
          operator: 'orange',
          partner: 'purple',
          viewer: 'cyan',
          user: 'blue',
        };
        return (
          <Tag color={colorMap[role] || 'blue'}>
            {role.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (record: UserResponseDto) => (
        <Space direction="vertical" size="small">
          <Tag color={record.isActive ? 'green' : 'red'}>
            {record.isActive ? 'Active' : 'Inactive'}
          </Tag>
          <Tag color={record.emailVerified ? 'blue' : 'orange'}>
            {record.emailVerified ? 'Verified' : 'Unverified'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Company',
      dataIndex: 'company',
      key: 'company',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: UserResponseDto) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => {
              setSelectedUser(record);
              setModalVisible(true);
            }}
          />
          <Button
            icon={<MailOutlined />}
            size="small"
            loading={resendingActivation === record.id}
            disabled={record.emailVerified}
            onClick={() => handleResendActivation(record.id)}
            title={record.emailVerified ? "Email already verified" : "Resend activation email"}
          />
          <Button
            size="small"
            onClick={() => handleToggleStatus(record.id)}
          >
            {record.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this user?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              icon={<DeleteOutlined />}
              size="small"
              danger
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Title level={3}>User Management</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setSelectedUser(undefined);
              setModalVisible(true);
            }}
          >
            Add User
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000 }}
        />
      </Card>

      <UserModal
        visible={modalVisible}
        user={selectedUser}
        onCancel={() => {
          setModalVisible(false);
          setSelectedUser(undefined);
        }}
        onSuccess={fetchUsers}
      />
    </Space>
  );
};

export default UserManagement;