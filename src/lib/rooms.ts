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
  roomId: string;
  storagePath: string;
  url: string;
  name: string | null;
  size: number;
  type: string;
  createdAt: string;
};

export type DrawingImage = { url: string; width: number; height: number; isRendered: boolean };

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
    roomId: row.room_id as string,
    storagePath: row.storage_path as string,
    url,
    name: (row.name as string) || null,
    size: (row.size as number) || 0,
    type: (row.type as string) || 'image/jpeg',
    createdAt: row.created_at as string,
  };
}

export async function listRoomPhotos(roomId: string): Promise<RoomPhoto[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('drawing_room_photos')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const rows = data || [];
  const withUrls = await Promise.all(
    rows.map(async (row: Record<string, unknown>) => {
      const path = row.storage_path as string;
      const { data: urlData } = await supabase.storage
        .from('room-photos')
        .createSignedUrl(path, 3600);
      return rowToPhoto(row, urlData?.signedUrl ?? '');
    })
  );
  return withUrls;
}

export async function uploadRoomPhoto(input: {
  roomId: string;
  projectId: string;
  file: File;
}): Promise<RoomPhoto> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const type = input.file.type || 'image/jpeg';
  const ext = (input.file.name.split('.').pop() || type.split('/')[1] || 'jpg').toLowerCase();
  const path = `projects/${input.projectId}/rooms/${input.roomId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('room-photos')
    .upload(path, input.file, { contentType: type });
  if (upErr) throw new Error(upErr.message);

  const { data: row, error } = await supabase
    .from('drawing_room_photos')
    .insert({
      room_id: input.roomId,
      user_id: user.id,
      storage_path: path,
      name: input.file.name,
      size: input.file.size,
      type,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const { data: urlData } = await supabase.storage
    .from('room-photos')
    .createSignedUrl(path, 3600);

  return rowToPhoto(row, urlData?.signedUrl ?? '');
}

export async function deleteRoomPhoto(photo: RoomPhoto): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.storage.from('room-photos').remove([photo.storagePath]);
  const { error } = await supabase.from('drawing_room_photos').delete().eq('id', photo.id);
  if (error) throw new Error(error.message);
}
