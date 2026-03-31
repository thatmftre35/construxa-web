'use client';

import { create } from 'zustand';
import { Task, TaskUrgency } from '@/types/project';
import { getSupabaseClient } from '@/lib/supabase';
import { useProjectStore } from '@/stores/projectStore';

interface TaskState {
  tasks: Task[];
  isLoaded: boolean;
  fetchTasks: () => Promise<void>;
  addTask: (data: { projectId: string; title: string; description: string; assignee: string; dueDate: string; urgency: TaskUrgency }) => Promise<Task>;
  updateTask: (id: string, data: Partial<{ projectId: string; title: string; description: string; assignee: string; dueDate: string; urgency: TaskUrgency }>) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
}

function resolveProjectName(projectId: string): string {
  const project = useProjectStore.getState().projects.find((p) => p.id === projectId);
  return project?.name || 'Unknown Project';
}

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    projectName: resolveProjectName(row.project_id as string),
    title: row.title as string,
    description: row.description as string,
    assignee: row.assignee as string,
    dueDate: row.due_date as string,
    urgency: row.urgency as TaskUrgency,
    completed: row.completed as boolean,
    createdAt: row.created_at as string,
  };
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoaded: false,

  fetchTasks: async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { set({ isLoaded: true }); return; }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)
        .order('due_date', { ascending: true });

      if (error) {
        console.warn('Failed to fetch tasks:', error.message);
        set({ isLoaded: true });
        return;
      }

      const tasks = (data || []).map(rowToTask);
      set({ tasks, isLoaded: true });
    } catch (err) {
      console.warn('Error fetching tasks:', err);
      set({ isLoaded: true });
    }
  },

  addTask: async (data) => {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: inserted, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        project_id: data.projectId,
        title: data.title,
        description: data.description,
        assignee: data.assignee,
        due_date: data.dueDate,
        urgency: data.urgency,
      })
      .select()
      .single();

    if (error) throw error;

    const newTask = rowToTask(inserted);
    set((state) => {
      const tasks = [...state.tasks, newTask].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
      return { tasks };
    });
    return newTask;
  },

  updateTask: async (id, data) => {
    const supabase = getSupabaseClient();
    const updates: Record<string, unknown> = {};
    if (data.projectId !== undefined) updates.project_id = data.projectId;
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.assignee !== undefined) updates.assignee = data.assignee;
    if (data.dueDate !== undefined) updates.due_date = data.dueDate;
    if (data.urgency !== undefined) updates.urgency = data.urgency;
    updates.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const updatedTask = rowToTask(updated);
    set((state) => ({
      tasks: state.tasks
        .map((t) => (t.id === id ? updatedTask : t))
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    }));
  },

  completeTask: async (id) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('tasks')
      .update({ completed: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
  },
}));
