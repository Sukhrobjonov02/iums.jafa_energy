export interface LoginDto {
  email: string;
  password: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'super_admin' | 'admin' | 'operator' | 'partner' | 'viewer' | 'user';
  phone?: string;
  address?: string;
  company?: string;
  position?: string;
  department?: string;
  adminLevel?: 'super' | 'standard' | 'limited';
  permissions?: string[];
  canManageUsers?: boolean;
  canManageSites?: boolean;
  canViewAnalytics?: boolean;
  preferences?: {
    theme?: 'light' | 'dark';
    notifications?: boolean;
  };
  timezone?: string;
  language?: string;
  isActive?: boolean;
  emailVerified?: boolean;
}

export interface SetPasswordDto {
  activation_link: string;
  password: string;
  confirm_password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
  confirm_password: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: 'super_admin' | 'admin' | 'operator' | 'partner' | 'viewer' | 'user';
  phone?: string;
  address?: string;
  company?: string;
  position?: string;
  department?: string;
  adminLevel?: 'super' | 'standard' | 'limited';
  permissions?: string[];
  canManageUsers?: boolean;
  canManageSites?: boolean;
  canViewAnalytics?: boolean;
  preferences?: {
    theme?: 'light' | 'dark';
    notifications?: boolean;
  };
  timezone?: string;
  language?: string;
  isActive?: boolean;
  emailVerified?: boolean;
}

export interface UserResponseDto {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'admin' | 'operator' | 'partner' | 'viewer' | 'user';
  phone?: string;
  address?: string;
  company?: string;
  position?: string;
  department?: string;
  adminLevel?: 'super' | 'standard' | 'limited';
  permissions?: string[];
  canManageUsers: boolean;
  canManageSites: boolean;
  canViewAnalytics: boolean;
  preferences: {
    theme?: 'light' | 'dark';
    notifications?: boolean;
  };
  timezone: string;
  language: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: string;
  passwordChangedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  message: string;
  user_id: string;
  accessToken: string;
}

export interface CreateUserResponse {
  user: UserResponseDto;
  activation_link: string;
  message: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}

export interface AuthContextType {
  user: UserResponseDto | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginDto) => Promise<void>;
  logout: () => void;
  register: (userData: CreateUserDto) => Promise<void>;
  activateAccount: (data: SetPasswordDto) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (data: ResetPasswordDto) => Promise<void>;
  changePassword: (data: ChangePasswordDto) => Promise<void>;
  refreshToken: () => Promise<void>;
  updateUser: (id: number, data: UpdateUserDto) => Promise<void>;
}

export interface SignInResponse {
  status: number;
  data: {
    access_token: string;
  };
}

export interface SignIn {
  email: string;
  password: string;
}