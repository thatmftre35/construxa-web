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
  created_at: string;
  updated_at: string;
}

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
