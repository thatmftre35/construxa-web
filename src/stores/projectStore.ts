'use client';

import { create } from 'zustand';
import { Project } from '@/types/project';
import { getSupabaseClient } from '@/lib/supabase';

interface ProjectDocument {
  id: string;
  projectId: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
  supabasePath?: string;
}

interface ProjectState {
  projects: Project[];
  documents: ProjectDocument[];
  addProject: (project: Omit<Project, 'id' | 'lastActivity' | 'progress' | 'status'>) => Project;
  getProject: (id: string) => Project | undefined;
  getProjectDocuments: (projectId: string) => ProjectDocument[];
  addDocument: (doc: Omit<ProjectDocument, 'id' | 'uploadedAt'>) => void;
  uploadDocument: (projectId: string, file: File) => Promise<ProjectDocument | null>;
}

let nextProjectId = 100;
let nextDocId = 100;

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  documents: [],

  addProject: (data) => {
    const newProject: Project = {
      ...data,
      id: String(nextProjectId++),
      status: 'active',
      lastActivity: 'Just now',
      progress: 0,
    };
    set((state) => ({ projects: [newProject, ...state.projects] }));
    return newProject;
  },

  getProject: (id) => {
    return get().projects.find((p) => p.id === id);
  },

  getProjectDocuments: (projectId) => {
    return get().documents.filter((d) => d.projectId === projectId);
  },

  addDocument: (doc) => {
    const newDoc: ProjectDocument = {
      ...doc,
      id: String(nextDocId++),
      uploadedAt: new Date().toISOString(),
    };
    set((state) => ({ documents: [...state.documents, newDoc] }));
  },

  uploadDocument: async (projectId, file) => {
    try {
      const supabase = getSupabaseClient();
      const ext = file.name.split('.').pop() || 'file';
      const path = `projects/${projectId}/${Date.now()}.${ext}`;

      const { data, error } = await supabase.storage
        .from('documents')
        .upload(path, file, { contentType: file.type });

      if (error) {
        console.warn('Supabase upload failed, storing locally:', error.message);
      }

      const url = URL.createObjectURL(file);

      const newDoc: ProjectDocument = {
        id: String(nextDocId++),
        projectId,
        name: file.name,
        url,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        supabasePath: data?.path,
      };

      set((state) => ({ documents: [...state.documents, newDoc] }));
      return newDoc;
    } catch (error) {
      console.warn('Upload error:', error);
      const url = URL.createObjectURL(file);
      const newDoc: ProjectDocument = {
        id: String(nextDocId++),
        projectId,
        name: file.name,
        url,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };
      set((state) => ({ documents: [...state.documents, newDoc] }));
      return newDoc;
    }
  },
}));
