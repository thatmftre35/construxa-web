export interface Project {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  description: string;
  value: string;
  startDate: string;
  completionDate: string | null;
  status: 'active' | 'completed' | 'on_hold' | 'planning';
  stage: string;
  sector: string;
  squareFootage: string;
  trades: string[];
  imageUrl: string | null;
  lastActivity: string;
  progress: number;
}

export interface Task {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  assignee: string;
  dueDate: string;
  status: 'todo' | 'in_progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface Alert {
  id: string;
  type: 'delivery' | 'rental' | 'weather' | 'inspection' | 'deadline';
  title: string;
  description: string;
  projectName: string;
  time: string;
  urgent: boolean;
}
