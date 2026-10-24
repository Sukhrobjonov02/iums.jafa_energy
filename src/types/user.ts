// User Management Types
export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'super_admin' | 'admin' | 'operator' | 'viewer' | 'user';
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
  preferences?: any;
  timezone?: string;
  language?: string;
  isActive?: boolean;
  emailVerified?: boolean;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: 'super_admin' | 'admin' | 'operator' | 'viewer' | 'user';
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
  preferences?: any;
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
  role: 'super_admin' | 'admin' | 'operator' | 'viewer' | 'user';
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
  preferences: any;
  timezone: string;
  language: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: string;
  passwordChangedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SetPasswordDto {
  activation_link: string;
  password: string;
  confirm_password: string;
}

export interface LoginDto {
  email: string;
  password: string;
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

// User Site Assignments
export interface CreateUserSiteDto {
  userId: number;
  siteId: number;
  role?: 'manager' | 'technician' | 'observer' | 'maintainer';
  accessLevel?: 'read_only' | 'read_write' | 'full_access' | 'admin';
  isActive?: boolean;
  assignedBy?: number;
  permissions?: string[];
  notes?: string;
}

export interface UpdateUserSiteDto {
  userId?: number;
  siteId?: number;
  role?: 'manager' | 'technician' | 'observer' | 'maintainer';
  accessLevel?: 'read_only' | 'read_write' | 'full_access' | 'admin';
  isActive?: boolean;
  assignedBy?: number;
  permissions?: string[];
  notes?: string;
}

export interface UserSiteResponseDto {
  id: number;
  userId: number;
  siteId: number;
  role: 'manager' | 'technician' | 'observer' | 'maintainer';
  accessLevel: 'read_only' | 'read_write' | 'full_access' | 'admin';
  isActive: boolean;
  assignedAt: string;
  assignedBy?: number;
  deactivatedAt?: string;
  deactivatedBy?: number;
  permissions?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeactivateUserSiteDto {
  deactivatedBy: number;
}