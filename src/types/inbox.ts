export interface Message {
  id: string;
  senderName: string;
  senderAvatar: string | null;
  projectName: string;
  preview: string;
  timestamp: string;
  unread: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  author: string;
  timestamp: string;
  priority: 'normal' | 'important' | 'urgent';
}

export interface Approval {
  id: string;
  documentName: string;
  type: 'drawing' | 'submittal' | 'invoice' | 'other';
  requester: string;
  projectName: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  flowSteps: ApprovalStep[];
  currentStep: number;
}

export interface ApprovalStep {
  role: string;
  status: 'pending' | 'approved' | 'rejected' | 'waiting';
}
