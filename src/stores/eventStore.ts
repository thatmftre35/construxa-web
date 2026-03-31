'use client';

import { create } from 'zustand';
import { Event, EventType } from '@/types/project';
import { getSupabaseClient } from '@/lib/supabase';
import { useProjectStore } from '@/stores/projectStore';

interface EventState {
  events: Event[];
  isLoaded: boolean;
  fetchEvents: () => Promise<void>;
  addEvent: (data: { projectId: string; type: EventType; description: string; eventDate: string }) => Promise<Event>;
  updateEvent: (id: string, data: Partial<{ projectId: string; type: EventType; description: string; eventDate: string }>) => Promise<void>;
  completeEvent: (id: string) => Promise<void>;
}

function resolveProjectName(projectId: string): string {
  const project = useProjectStore.getState().projects.find((p) => p.id === projectId);
  return project?.name || 'Unknown Project';
}

function rowToEvent(row: Record<string, unknown>): Event {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    projectId: row.project_id as string,
    projectName: resolveProjectName(row.project_id as string),
    type: row.type as EventType,
    description: row.description as string,
    eventDate: row.event_date as string,
    completed: row.completed as boolean,
    createdAt: row.created_at as string,
  };
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  isLoaded: false,

  fetchEvents: async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { set({ isLoaded: true }); return; }

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)
        .order('event_date', { ascending: true });

      if (error) {
        console.warn('Failed to fetch events:', error.message);
        set({ isLoaded: true });
        return;
      }

      const events = (data || []).map(rowToEvent);
      set({ events, isLoaded: true });
    } catch (err) {
      console.warn('Error fetching events:', err);
      set({ isLoaded: true });
    }
  },

  addEvent: async (data) => {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: inserted, error } = await supabase
      .from('events')
      .insert({
        user_id: user.id,
        project_id: data.projectId,
        type: data.type,
        description: data.description,
        event_date: data.eventDate,
      })
      .select()
      .single();

    if (error) throw error;

    const newEvent = rowToEvent(inserted);
    set((state) => {
      const events = [...state.events, newEvent].sort(
        (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
      );
      return { events };
    });
    return newEvent;
  },

  updateEvent: async (id, data) => {
    const supabase = getSupabaseClient();
    const updates: Record<string, unknown> = {};
    if (data.projectId !== undefined) updates.project_id = data.projectId;
    if (data.type !== undefined) updates.type = data.type;
    if (data.description !== undefined) updates.description = data.description;
    if (data.eventDate !== undefined) updates.event_date = data.eventDate;
    updates.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const updatedEvent = rowToEvent(updated);
    set((state) => ({
      events: state.events
        .map((e) => (e.id === id ? updatedEvent : e))
        .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()),
    }));
  },

  completeEvent: async (id) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('events')
      .update({ completed: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    set((state) => ({ events: state.events.filter((e) => e.id !== id) }));
  },
}));
