'use client';

import { create } from 'zustand';
import { Project } from '@/types/project';
import { getSupabaseClient } from '@/lib/supabase';

export type OcrStatus = 'none' | 'pending' | 'processing' | 'done' | 'failed';

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
  isRevisionGroup: boolean;
  ocrStatus?: OcrStatus;
}

export interface DocumentSearchResult {
  id: string;
  projectId: string;
  name: string;
  folder: string;
  type: string;
  ocrStatus: OcrStatus;
  snippet: string;
  rank: number;
}

export interface FolderOcrRule {
  projectId: string;
  folder: string;
}

// OCR only makes sense for images and PDFs.
export function isOcrable(type: string): boolean {
  const t = (type || '').toLowerCase();
  return t.startsWith('image/') || t === 'application/pdf' || t.endsWith('/pdf');
}

export interface DocumentRevision {
  id: string;
  documentId: string;
  revisionNumber: number;
  name: string;
  type: string;
  size: number;
  storagePath: string | null;
  url: string;
  createdAt: string;
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
    isRevisionGroup: !!(row.is_revision_group),
    ocrStatus: ((row.ocr_status as OcrStatus) || 'none'),
  };
}

interface ProjectState {
  projects: Project[];
  documents: ProjectDocument[];
  folderOcrRules: FolderOcrRule[];
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
  convertToRevisionGroup: (documentId: string) => Promise<void>;
  fetchRevisions: (documentId: string) => Promise<DocumentRevision[]>;
  uploadRevision: (documentId: string, file: File) => Promise<DocumentRevision | null>;
  ocrDocument: (id: string) => Promise<void>;
  ocrFolder: (projectId: string, folder: string) => Promise<void>;
  fetchFolderOcrRules: (projectId: string) => Promise<void>;
  setFolderAutoOcr: (projectId: string, folder: string, enabled: boolean) => Promise<void>;
  searchDocuments: (query: string) => Promise<DocumentSearchResult[]>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  documents: [],
  folderOcrRules: [],
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
        isRevisionGroup: false,
      };

      // Auto-OCR if this folder (or an ancestor) is flagged for it.
      const autoOcr = get().folderOcrRules.some(
        (r) => r.projectId === projectId && (folder === r.folder || folder.startsWith(r.folder + '/'))
      );
      if (autoOcr && isOcrable(file.type) && docRow?.id) {
        newDoc.ocrStatus = 'pending';
        get().ocrDocument(docRow.id as string).catch(() => {});
      }

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
        isRevisionGroup: false,
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
      const doc = get().documents.find((d) => d.id === id);
      const { error } = await supabase
        .from('documents')
        .update({ name })
        .eq('id', id);

      if (error) console.warn('Failed to rename document:', error.message);

      // Room photos are filed under "Site Photos/{drawing name}/{room}". If this
      // document is such a drawing, move those subfolders so they keep matching.
      const moves: { id: string; folder: string }[] = [];
      if (doc && doc.name !== name) {
        const seg = (s: string) => (s || '').replace(/\//g, '-').trim() || 'Untitled';
        const oldBase = `Site Photos/${seg(doc.name)}`;
        const newBase = `Site Photos/${seg(name)}`;
        const [{ data: exact }, { data: nested }] = await Promise.all([
          supabase.from('documents').select('id, folder').eq('project_id', doc.projectId).eq('folder', oldBase),
          supabase.from('documents').select('id, folder').eq('project_id', doc.projectId).like('folder', `${oldBase}/%`),
        ]);
        const rows = [...(exact || []), ...(nested || [])] as { id: string; folder: string }[];
        rows.forEach((r) => moves.push({ id: r.id, folder: newBase + r.folder.slice(oldBase.length) }));
        await Promise.all(moves.map((m) => supabase.from('documents').update({ folder: m.folder }).eq('id', m.id)));
      }

      set((state) => ({
        documents: state.documents.map((d) => {
          if (d.id === id) return { ...d, name };
          const m = moves.find((x) => x.id === d.id);
          return m ? { ...d, folder: m.folder } : d;
        }),
      }));
    } catch (err) {
      console.warn('Error renaming document:', err);
    }
  },

  convertToRevisionGroup: async (documentId) => {
    try {
      const supabase = getSupabaseClient();
      const doc = get().documents.find((d) => d.id === documentId);
      if (!doc) return;

      // Strip file extension for the group name
      const groupName = doc.name.replace(/\.[^/.]+$/, '');

      // Update document to be a revision group
      const { error: updateError } = await supabase
        .from('documents')
        .update({ is_revision_group: true, name: groupName })
        .eq('id', documentId);

      if (updateError) {
        console.warn('Failed to convert to revision group:', updateError.message);
        return;
      }

      // Create first revision from original file
      const { error: revError } = await supabase
        .from('document_revisions')
        .insert({
          document_id: documentId,
          revision_number: 1,
          name: doc.name,
          type: doc.type,
          size: doc.size,
          storage_path: doc.storagePath || null,
        });

      if (revError) console.warn('Failed to create initial revision:', revError.message);

      set((state) => ({
        documents: state.documents.map((d) =>
          d.id === documentId ? { ...d, name: groupName, isRevisionGroup: true } : d
        ),
      }));
    } catch (err) {
      console.warn('Error converting to revision group:', err);
    }
  },

  fetchRevisions: async (documentId) => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('document_revisions')
        .select('*')
        .eq('document_id', documentId)
        .order('revision_number', { ascending: true });

      if (error) {
        console.warn('Failed to fetch revisions:', error.message);
        return [];
      }

      const revisions: DocumentRevision[] = await Promise.all(
        ((data || []) as Record<string, unknown>[]).map(async (r) => {
          let url = '';
          const storagePath = r.storage_path as string | null;
          if (storagePath) {
            const { data: urlData } = await supabase.storage
              .from('documents')
              .createSignedUrl(storagePath, 3600);
            if (urlData?.signedUrl) url = urlData.signedUrl;
          }
          return {
            id: r.id as string,
            documentId: r.document_id as string,
            revisionNumber: r.revision_number as number,
            name: r.name as string,
            type: r.type as string,
            size: (r.size as number) || 0,
            storagePath,
            url,
            createdAt: r.created_at as string,
          };
        })
      );

      return revisions;
    } catch (err) {
      console.warn('Error fetching revisions:', err);
      return [];
    }
  },

  uploadRevision: async (documentId, file) => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get next revision number
      const { data: existing } = await supabase
        .from('document_revisions')
        .select('revision_number')
        .eq('document_id', documentId)
        .order('revision_number', { ascending: false })
        .limit(1);

      const nextNum = ((existing?.[0] as Record<string, unknown>)?.revision_number as number || 0) + 1;

      // Upload file to storage
      const doc = get().documents.find((d) => d.id === documentId);
      const projectId = doc?.projectId || 'unknown';
      const ext = file.name.split('.').pop() || 'file';
      const path = `projects/${projectId}/${Date.now()}_rev${nextNum}.${ext}`;

      const { data: storageData } = await supabase.storage
        .from('documents')
        .upload(path, file, { contentType: file.type });

      const storagePath = storageData?.path || null;

      // Insert revision row
      const { data: revRow, error: dbError } = await supabase
        .from('document_revisions')
        .insert({
          document_id: documentId,
          revision_number: nextNum,
          name: file.name,
          type: file.type,
          size: file.size,
          storage_path: storagePath,
        })
        .select()
        .single();

      if (dbError) {
        console.warn('Failed to save revision:', dbError.message);
        return null;
      }

      let url = '';
      if (storagePath) {
        const { data: urlData } = await supabase.storage
          .from('documents')
          .createSignedUrl(storagePath, 3600);
        if (urlData?.signedUrl) url = urlData.signedUrl;
      }

      return {
        id: (revRow as Record<string, unknown>).id as string,
        documentId,
        revisionNumber: nextNum,
        name: file.name,
        type: file.type,
        size: file.size,
        storagePath,
        url,
        createdAt: new Date().toISOString(),
      };
    } catch (err) {
      console.warn('Error uploading revision:', err);
      return null;
    }
  },

  ocrDocument: async (id) => {
    const supabase = getSupabaseClient();
    set((state) => ({
      documents: state.documents.map((d) => (d.id === id ? { ...d, ocrStatus: 'pending' } : d)),
    }));
    try {
      const { data, error } = await supabase.functions.invoke('ocr-document', {
        body: { documentId: id },
      });
      if (error) {
        // supabase-js surfaces a generic "non-2xx status code" message and hides
        // the real reason in error.context (the Response). Dig it out.
        let detail = error.message;
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.text === 'function') {
          try {
            const raw = await ctx.text();
            const parsed = raw ? JSON.parse(raw) : null;
            detail = (parsed as { error?: string })?.error || raw || detail;
          } catch {
            /* keep generic message */
          }
        }
        throw new Error(detail);
      }
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      set((state) => ({
        documents: state.documents.map((d) => (d.id === id ? { ...d, ocrStatus: 'done' } : d)),
      }));
    } catch (err) {
      set((state) => ({
        documents: state.documents.map((d) => (d.id === id ? { ...d, ocrStatus: 'failed' } : d)),
      }));
      throw err;
    }
  },

  ocrFolder: async (projectId, folder) => {
    const docs = get().documents.filter(
      (d) =>
        d.projectId === projectId &&
        (d.folder === folder || d.folder.startsWith(folder + '/')) &&
        !d.isRevisionGroup &&
        isOcrable(d.type)
    );
    for (const d of docs) {
      await get().ocrDocument(d.id).catch(() => {});
    }
  },

  fetchFolderOcrRules: async (projectId) => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('folder_ocr_rules')
        .select('project_id, folder')
        .eq('project_id', projectId);
      if (error) { console.warn('Failed to fetch OCR rules:', error.message); return; }
      const rules: FolderOcrRule[] = (data || []).map((r: Record<string, unknown>) => ({
        projectId: r.project_id as string,
        folder: r.folder as string,
      }));
      set((state) => ({
        folderOcrRules: [...state.folderOcrRules.filter((x) => x.projectId !== projectId), ...rules],
      }));
    } catch (err) {
      console.warn('Error fetching OCR rules:', err);
    }
  },

  setFolderAutoOcr: async (projectId, folder, enabled) => {
    const supabase = getSupabaseClient();
    if (enabled) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('folder_ocr_rules')
        .upsert({ project_id: projectId, folder, user_id: user.id }, { onConflict: 'project_id,folder' });
      if (error) throw new Error(error.message);
      set((state) => ({
        folderOcrRules: [
          ...state.folderOcrRules.filter((x) => !(x.projectId === projectId && x.folder === folder)),
          { projectId, folder },
        ],
      }));
    } else {
      const { error } = await supabase
        .from('folder_ocr_rules')
        .delete()
        .eq('project_id', projectId)
        .eq('folder', folder);
      if (error) throw new Error(error.message);
      set((state) => ({
        folderOcrRules: state.folderOcrRules.filter((x) => !(x.projectId === projectId && x.folder === folder)),
      }));
    }
  },

  searchDocuments: async (query) => {
    const q = query.trim();
    if (!q) return [];
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('search_documents', { q });
    if (error) { console.warn('search_documents failed:', error.message); return []; }
    return ((data || []) as Record<string, unknown>[]).map((r) => ({
      id: r.id as string,
      projectId: r.project_id as string,
      name: r.name as string,
      folder: (r.folder as string) || '',
      type: r.type as string,
      ocrStatus: (r.ocr_status as OcrStatus) || 'none',
      snippet: (r.snippet as string) || '',
      rank: (r.rank as number) || 0,
    }));
  },
}));
