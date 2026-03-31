'use client';

import { create } from 'zustand';
import { Project } from '@/types/project';
import { getSupabaseClient } from '@/lib/supabase';

export interface ProjectDocument {
  id: string;
  projectId: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
  storagePath?: string;
}

// Maps Supabase row to our Project type
function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    address: row.address as string,
    city: row.city as string,
    state: row.state as string,
    description: row.description as string,
    value: row.value as string,
    startDate: row.start_date as string,
    completionDate: (row.completion_date as string) || null,
    status: (row.status as Project['status']) || 'active',
    stage: row.stage as string,
    sector: row.sector as string,
    squareFootage: row.square_footage as string,
    trades: (row.trades as string[]) || [],
    imageUrl: (row.image_url as string) || null,
    lastActivity: formatTimeAgo(row.updated_at as string),
    progress: (row.progress as number) || 0,
  };
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function rowToDocument(row: Record<string, unknown>): ProjectDocument {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    name: row.name as string,
    url: '', // populated via signed URL after fetch
    type: row.type as string,
    size: row.size as number,
    uploadedAt: row.created_at as string,
    storagePath: row.storage_path as string,
  };
}

interface ProjectState {
  projects: Project[];
  documents: ProjectDocument[];
  isLoaded: boolean;
  fetchProjects: () => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'lastActivity' | 'progress' | 'status'>) => Promise<Project>;
  getProject: (id: string) => Project | undefined;
  getProjectDocuments: (projectId: string) => ProjectDocument[];
  fetchDocuments: (projectId: string) => Promise<void>;
  uploadDocument: (projectId: string, file: File) => Promise<ProjectDocument | null>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  documents: [],
  isLoaded: false,

  fetchProjects: async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to fetch projects:', error.message);
        set({ isLoaded: true });
        return;
      }

      const projects = (data || []).map((row: Record<string, unknown>) => ({
        ...rowToProject(row),
        isShared: user ? row.user_id !== user.id : false,
      }));
      set({ projects, isLoaded: true });
    } catch (err) {
      console.warn('Error fetching projects:', err);
      set({ isLoaded: true });
    }
  },

  addProject: async (data) => {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const row = {
      user_id: user.id,
      name: data.name,
      address: data.address,
      city: data.city,
      state: data.state,
      description: data.description,
      value: data.value,
      start_date: data.startDate,
      completion_date: data.completionDate,
      status: 'active',
      stage: data.stage || 'Planning',
      sector: data.sector,
      square_footage: data.squareFootage,
      trades: data.trades,
      image_url: data.imageUrl,
      progress: 0,
    };

    const { data: inserted, error } = await supabase
      .from('projects')
      .insert(row)
      .select()
      .single();

    if (error) throw error;

    const newProject = rowToProject(inserted);
    set((state) => ({ projects: [newProject, ...state.projects] }));
    return newProject;
  },

  getProject: (id) => {
    return get().projects.find((p) => p.id === id);
  },

  getProjectDocuments: (projectId) => {
    return get().documents.filter((d) => d.projectId === projectId);
  },

  fetchDocuments: async (projectId) => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to fetch documents:', error.message);
        return;
      }

      const docs = (data || []).map(rowToDocument);

      // Generate signed URLs for each document
      const docsWithUrls = await Promise.all(
        docs.map(async (doc: ProjectDocument) => {
          if (doc.storagePath) {
            const { data: urlData } = await supabase.storage
              .from('documents')
              .createSignedUrl(doc.storagePath, 3600);
            if (urlData?.signedUrl) {
              return { ...doc, url: urlData.signedUrl };
            }
          }
          return doc;
        })
      );

      // Replace documents for this project, keep others
      set((state) => ({
        documents: [
          ...state.documents.filter((d) => d.projectId !== projectId),
          ...docsWithUrls,
        ],
      }));
    } catch (err) {
      console.warn('Error fetching documents:', err);
    }
  },

  uploadDocument: async (projectId, file) => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const ext = file.name.split('.').pop() || 'file';
      const path = `projects/${projectId}/${Date.now()}.${ext}`;

      const { data: storageData, error: storageError } = await supabase.storage
        .from('documents')
        .upload(path, file, { contentType: file.type });

      if (storageError) {
        console.warn('Supabase storage upload failed:', storageError.message);
      }

      const storagePath = storageData?.path || null;

      // Insert metadata into documents table
      const { data: docRow, error: dbError } = await supabase
        .from('documents')
        .insert({
          project_id: projectId,
          user_id: user.id,
          name: file.name,
          type: file.type,
          size: file.size,
          storage_path: storagePath,
          folder: '',
        })
        .select()
        .single();

      if (dbError) {
        console.warn('Failed to save document metadata:', dbError.message);
      }

      // Get signed URL for display
      let url = URL.createObjectURL(file);
      if (storagePath) {
        const { data: urlData } = await supabase.storage
          .from('documents')
          .createSignedUrl(storagePath, 3600);
        if (urlData?.signedUrl) {
          url = urlData.signedUrl;
        }
      }

      const newDoc: ProjectDocument = {
        id: docRow?.id || String(Date.now()),
        projectId,
        name: file.name,
        url,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        storagePath: storagePath || undefined,
      };

      set((state) => ({ documents: [...state.documents, newDoc] }));
      return newDoc;
    } catch (error) {
      console.warn('Upload error:', error);
      const url = URL.createObjectURL(file);
      const newDoc: ProjectDocument = {
        id: String(Date.now()),
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
