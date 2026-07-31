export interface Profile {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  country: string | null;
  phone: string | null;
  role: string | null;
  trade: string | null;
  company: string | null;
  workflow_preferences: string[] | null;
  plan: string;
  receive_updates: boolean;
  // Platform staff role, separate from any org membership. null = ordinary user.
  platform_role: PlatformRole | null;
  created_at: string;
  updated_at: string;
}

// Platform-staff access levels (gates the /platform admin center).
export type PlatformRole = 'superadmin' | 'support' | 'billing' | 'readonly';

export interface SignUpFormData {
  email: string;
  password: string;
  confirmPassword: string;
  confirmEmail?: string;
  organizationCode?: string;
  isOrganization: boolean;
}

export interface ProfileFormData {
  firstName: string;
  lastName: string;
  country: string;
  phone: string;
  role: string;
  trade: string;
  company: string;
  receiveUpdates: boolean;
}
