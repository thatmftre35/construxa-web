'use client';

import { getSupabaseClient } from './supabase';

export type Bbox = { x: number; y: number; w: number; h: number };

export type DrawingRoom = {
  id: string;
  documentId: string;
  projectId: string;
  label: string;
  bbox: Bbox;
  source: 'ai' | 'manual';
  createdAt: string;
};

export type RoomPhoto = {
  id: string;
  storagePath: string;
  url: string;
  name: string | null;
  size: number;
  type: string;
  createdAt: string;
};

export type DrawingImage = { url: string; width: number; height: number; isRendered: boolean };

// Room photos live as regular project documents filed under
// "Site Photos/{drawing filename}/{room name}", so they show up in the
// project's Site Photos folder browser. A path segment can't contain "/",
// so slashes in names are flattened to keep the hierarchy intact.
function sanitizeSegment(s: string): string {
  return (s || '').replace(/\//g, '-').trim() || 'Untitled';
}

export function roomPhotosFolder(drawingName: string, roomLabel: string): string {
  return `Site Photos/${sanitizeSegment(drawingName)}/${sanitizeSegment(roomLabel)}`;
}

export async function renderPdfPage(documentId: string, page = 1): Promise<{ url: string; width: number; height: number; page: number }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('render-pdf-page', {
    body: { documentId, page },
  });
  if (error) throw new Error(error.message ?? 'Failed to render PDF');
  if ((data as Record<string, unknown>)?.error) throw new Error((data as Record<string, string>).error);
  return data as { url: string; width: number; height: number; page: number };
}

export async function getDrawingImage(doc: { id: string; type: string; url: string }): Promise<DrawingImage> {
  if (doc.type === 'application/pdf') {
    const r = await renderPdfPage(doc.id, 1);
    return { url: r.url, width: r.width, height: r.height, isRendered: true };
  }
  return { url: doc.url, width: 0, height: 0, isRendered: false };
}

function rowToRoom(row: Record<string, unknown>): DrawingRoom {
  return {
    id: row.id as string,
    documentId: row.document_id as string,
    projectId: row.project_id as string,
    label: (row.label as string) || 'Room',
    bbox: row.bbox as Bbox,
    source: (row.source as 'ai' | 'manual') || 'manual',
    createdAt: row.created_at as string,
  };
}

export async function listRooms(documentId: string): Promise<DrawingRoom[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('drawing_rooms')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map(rowToRoom);
}

export async function createRoom(input: {
  documentId: string;
  projectId: string;
  label: string;
  bbox: Bbox;
  source: 'ai' | 'manual';
}): Promise<DrawingRoom> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('drawing_rooms')
    .insert({
      document_id: input.documentId,
      project_id: input.projectId,
      user_id: user.id,
      label: input.label,
      bbox: input.bbox,
      source: input.source,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToRoom(data);
}

export async function updateRoom(id: string, updates: { label?: string; bbox?: Bbox }): Promise<void> {
  const supabase = getSupabaseClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.label !== undefined) patch.label = updates.label;
  if (updates.bbox !== undefined) patch.bbox = updates.bbox;
  const { error } = await supabase.from('drawing_rooms').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteRoom(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('drawing_rooms').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

function rowToPhoto(row: Record<string, unknown>, url: string): RoomPhoto {
  return {
    id: row.id as string,
    storagePath: row.storage_path as string,
    url,
    name: (row.name as string) || null,
    size: (row.size as number) || 0,
    type: (row.type as string) || 'image/jpeg',
    createdAt: row.created_at as string,
  };
}

export async function listRoomPhotos(input: {
  projectId: string;
  drawingName: string;
  roomLabel: string;
}): Promise<RoomPhoto[]> {
  const supabase = getSupabaseClient();
  const folder = roomPhotosFolder(input.drawingName, input.roomLabel);
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', input.projectId)
    .eq('folder', folder)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data || []).filter((r: Record<string, unknown>) => r.storage_path);
  const withUrls = await Promise.all(
    rows.map(async (row: Record<string, unknown>) => {
      const path = row.storage_path as string;
      const { data: urlData } = await supabase.storage
        .from('documents')
        .createSignedUrl(path, 3600);
      return rowToPhoto(row, urlData?.signedUrl ?? '');
    })
  );
  return withUrls;
}

export async function uploadRoomPhoto(input: {
  projectId: string;
  drawingName: string;
  roomLabel: string;
  file: File;
}): Promise<RoomPhoto> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const type = input.file.type || 'image/jpeg';
  const ext = (input.file.name.split('.').pop() || type.split('/')[1] || 'jpg').toLowerCase();
  const folder = roomPhotosFolder(input.drawingName, input.roomLabel);
  const path = `projects/${input.projectId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('documents')
    .upload(path, input.file, { contentType: type });
  if (upErr) throw new Error(upErr.message);

  const { data: row, error } = await supabase
    .from('documents')
    .insert({
      project_id: input.projectId,
      user_id: user.id,
      name: input.file.name,
      type,
      size: input.file.size,
      storage_path: path,
      folder,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const { data: urlData } = await supabase.storage
    .from('documents')
    .createSignedUrl(path, 3600);

  return rowToPhoto(row, urlData?.signedUrl ?? '');
}

export async function deleteRoomPhoto(photo: RoomPhoto): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.storage.from('documents').remove([photo.storagePath]);
  const { error } = await supabase.from('documents').delete().eq('id', photo.id);
  if (error) throw new Error(error.message);
}

// Re-file a room's photos when the room is renamed.
export async function moveRoomPhotosFolder(input: {
  projectId: string;
  drawingName: string;
  oldLabel: string;
  newLabel: string;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const from = roomPhotosFolder(input.drawingName, input.oldLabel);
  const to = roomPhotosFolder(input.drawingName, input.newLabel);
  if (from === to) return;
  const { error } = await supabase
    .from('documents')
    .update({ folder: to })
    .eq('project_id', input.projectId)
    .eq('folder', from);
  if (error) throw new Error(error.message);
}

// Remove every photo filed under a room when the room itself is deleted.
export async function deleteRoomPhotosFolder(input: {
  projectId: string;
  drawingName: string;
  roomLabel: string;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const folder = roomPhotosFolder(input.drawingName, input.roomLabel);
  const { data } = await supabase
    .from('documents')
    .select('id, storage_path')
    .eq('project_id', input.projectId)
    .eq('folder', folder);
  const rows = (data || []) as Array<{ id: string; storage_path: string | null }>;
  if (rows.length === 0) return;
  const paths = rows.map((r) => r.storage_path).filter(Boolean) as string[];
  if (paths.length > 0) await supabase.storage.from('documents').remove(paths);
  await supabase.from('documents').delete().in('id', rows.map((r) => r.id));
}
