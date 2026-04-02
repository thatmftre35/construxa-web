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
  folder: string;
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
    folder: (row.folder as string) || '',
  };
}

interface ProjectState {
  projects: Project[];
  documents: ProjectDocument[];
  isLoaded: boolean;
  fetchProjects: () => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'lastActivity' | 'progress' | 'status'>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'lastActivity' | 'progress'>>) => Promise<void>;
  getProject: (id: string) => Project | undefined;
  getProjectDocuments: (projectId: string) => ProjectDocument[];
  fetchDocuments: (projectId: string) => Promise<void>;
  uploadDocument: (projectId: string, file: File, folder?: string) => Promise<ProjectDocument | null>;
  deleteDocuments: (ids: string[]) => Promise<void>;
  moveDocuments: (ids: string[], folder: string) => Promise<void>;
  renameDocument: (id: string, name: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  documents: [],
  isLoaded: false,

  fetchProjects: async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { set({ isLoaded: true }); return; }

      // Fetch own projects
      const { data: ownData, error: ownError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ownError) {
        console.warn('Failed to fetch projects:', ownError.message);
        set({ isLoaded: true });
        return;
      }

      // Fetch shared projects
      const { data: shareRows } = await supabase
        .from('project_shares')
        .select('project_id')
        .eq('shared_with_id', user.id);

      const sharedProjectIds = (shareRows || []).map((r: Record<string, unknown>) => r.project_id as string);
      let sharedData: Record<string, unknown>[] = [];
      if (sharedProjectIds.length > 0) {
        const { data } = await supabase
          .from('projects')
          .select('*')
          .in('id', sharedProjectIds)
          .order('created_at', { ascending: false });
        sharedData = (data || []) as Record<string, unknown>[];
      }

      const ownProjects = (ownData || []).map((row: Record<string, unknown>) => ({
        ...rowToProject(row),
        isShared: false,
      }));
      const sharedProjects = sharedData.map((row: Record<string, unknown>) => ({
        ...rowToProject(row),
        isShared: true,
      }));

      set({ projects: [...ownProjects, ...sharedProjects], isLoaded: true });
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

  updateProject: async (id, updates) => {
    const supabase = getSupabaseClient();
    const row: Record<string, unknown> = {};
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.address !== undefined) row.address = updates.address;
    if (updates.city !== undefined) row.city = updates.city;
    if (updates.state !== undefined) row.state = updates.state;
    if (updates.description !== undefined) row.description = updates.description;
    if (updates.value !== undefined) row.value = updates.value;
    if (updates.startDate !== undefined) row.start_date = updates.startDate;
    if (updates.completionDate !== undefined) row.completion_date = updates.completionDate;
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.stage !== undefined) row.stage = updates.stage;
    if (updates.sector !== undefined) row.sector = updates.sector;
    if (updates.squareFootage !== undefined) row.square_footage = updates.squareFootage;
    if (updates.trades !== undefined) row.trades = updates.trades;
    if (updates.imageUrl !== undefined) row.image_url = updates.imageUrl;

    const { data, error } = await supabase
      .from('projects')
      .update(row)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const updated = rowToProject(data);
    set((state) => ({
      projects: state.projects.map((p) => p.id === id ? { ...updated, isShared: p.isShared } : p),
    }));
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

  uploadDocument: async (projectId, file, folder = '') => {
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
          folder,
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
        folder,
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
        folder,
      };
      set((state) => ({ documents: [...state.documents, newDoc] }));
      return newDoc;
    }
  },

  deleteDocuments: async (ids) => {
    try {
      const supabase = getSupabaseClient();

      // Delete from storage first
      const docs = get().documents.filter((d) => ids.includes(d.id));
      const storagePaths = docs.map((d) => d.storagePath).filter(Boolean) as string[];
      if (storagePaths.length > 0) {
        await supabase.storage.from('documents').remove(storagePaths);
      }

      // Delete from DB
      const { error } = await supabase
        .from('documents')
        .delete()
        .in('id', ids);

      if (error) console.warn('Failed to delete documents:', error.message);

      set((state) => ({
        documents: state.documents.filter((d) => !ids.includes(d.id)),
      }));
    } catch (err) {
      console.warn('Error deleting documents:', err);
    }
  },

  moveDocuments: async (ids, folder) => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('documents')
        .update({ folder })
        .in('id', ids);

      if (error) console.warn('Failed to move documents:', error.message);

      set((state) => ({
        documents: state.documents.map((d) =>
          ids.includes(d.id) ? { ...d, folder } : d
        ),
      }));
    } catch (err) {
      console.warn('Error moving documents:', err);
    }
  },

  renameDocument: async (id, name) => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('documents')
        .update({ name })
        .eq('id', id);

      if (error) console.warn('Failed to rename document:', error.message);

      set((state) => ({
        documents: state.documents.map((d) =>
          d.id === id ? { ...d, name } : d
        ),
      }));
    } catch (err) {
      console.warn('Error renaming document:', err);
    }
  },
}));
