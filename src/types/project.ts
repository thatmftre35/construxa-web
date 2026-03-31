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
  isShared?: boolean;
}

export type TaskUrgency = 'low' | 'moderate' | 'high';

export interface Task {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  assignee: string;
  dueDate: string;
  urgency: TaskUrgency;
  completed: boolean;
  createdAt: string;
}

export type EventType =
  | 'inspection'
  | 'deadline'
  | 'safety_training'
  | 'concrete_pour'
  | 'meeting'
  | 'walkthrough'
  | 'testing'
  | 'equipment_delivery'
  | 'material_delivery'
  | 'financial'
  | 'other';

export interface Event {
  id: string;
  userId: string;
  projectId: string;
  projectName: string;
  type: EventType;
  description: string;
  eventDate: string;
  completed: boolean;
  createdAt: string;
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
