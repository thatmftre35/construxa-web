'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Camera, Upload, X, Loader2 } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import {
  listRooms, createRoom, updateRoom, deleteRoom,
  listRoomPhotos, uploadRoomPhoto, deleteRoomPhoto,
  getDrawingImage,
  type DrawingRoom, type RoomPhoto, type Bbox,
} from '@/lib/rooms';

const OVERLAY_BG = 'rgba(120, 180, 230, 0.32)';
const OVERLAY_BORDER = 'rgba(80, 150, 220, 0.85)';

type Mode = 'view' | 'draw';

export default function DrawingViewerPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const docId = params.docId as string;

  const { documents, fetchDocuments } = useProjectStore();
  const doc = useMemo(() => documents.find((d) => d.id === docId), [documents, docId]);

  useEffect(() => {
    if (!documents.find((d) => d.id === docId)) fetchDocuments(projectId);
  }, [projectId, docId, documents, fetchDocuments]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);
  const [displayRect, setDisplayRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const [drawingUrl, setDrawingUrl] = useState<string | null>(null);
  const [renderingPdf, setRenderingPdf] = useState(false);
  const [rooms, setRooms] = useState<DrawingRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [mode, setMode] = useState<Mode>('view');
  const [activeRoom, setActiveRoom] = useState<DrawingRoom | null>(null);

  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawRect, setDrawRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Track image display size (recomputes on resize and image load).
  useEffect(() => {
    const recompute = () => {
      if (!imgRef.current || !containerRef.current) return;
      const ir = imgRef.current.getBoundingClientRect();
      const cr = containerRef.current.getBoundingClientRect();
      setDisplayRect({
        x: ir.left - cr.left,
        y: ir.top - cr.top,
        w: ir.width,
        h: ir.height,
      });
    };
    recompute();
    window.addEventListener('resize', recompute);
    const obs = new ResizeObserver(recompute);
    if (imgRef.current) obs.observe(imgRef.current);
    return () => {
      window.removeEventListener('resize', recompute);
      obs.disconnect();
    };
  }, [imgNatural, doc?.url]);

  // Resolve the URL we actually display: native image URL, or a server-rendered PDF page.
  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    if (doc.type === 'application/pdf') {
      setRenderingPdf(true);
      getDrawingImage({ id: doc.id, type: doc.type, url: doc.url })
        .then((r) => { if (!cancelled) setDrawingUrl(r.url); })
        .catch((e) => alert((e as Error).message || 'Could not render PDF page.'))
        .finally(() => { if (!cancelled) setRenderingPdf(false); });
    } else {
      setDrawingUrl(doc.url);
    }
    return () => { cancelled = true; };
  }, [doc?.id, doc?.type, doc?.url]);

  useEffect(() => {
    if (!docId) return;
    setLoadingRooms(true);
    listRooms(docId)
      .then(setRooms)
      .catch((e) => alert((e as Error).message || 'Failed to load rooms'))
      .finally(() => setLoadingRooms(false));
  }, [docId]);

  const screenToNorm = (x: number, y: number) => {
    if (!displayRect) return { x: 0, y: 0 };
    return {
      x: clamp01((x - displayRect.x) / displayRect.w),
      y: clamp01((y - displayRect.y) / displayRect.h),
    };
  };

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if (mode !== 'draw' || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    setDrawStart({ x: px, y: py });
    setDrawRect({ x: px, y: py, w: 0, h: 0 });
  };

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (mode !== 'draw' || !drawStart || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    setDrawRect({
      x: Math.min(drawStart.x, px),
      y: Math.min(drawStart.y, py),
      w: Math.abs(px - drawStart.x),
      h: Math.abs(py - drawStart.y),
    });
  };

  const onCanvasMouseUp = async () => {
    if (mode !== 'draw' || !drawRect || !doc) {
      setDrawStart(null);
      setDrawRect(null);
      return;
    }
    const rect = drawRect;
    setDrawStart(null);
    setDrawRect(null);
    if (rect.w < 12 || rect.h < 12) return;

    const tl = screenToNorm(rect.x, rect.y);
    const br = screenToNorm(rect.x + rect.w, rect.y + rect.h);
    const bbox: Bbox = { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
    const label = prompt('Room label', 'Room')?.trim();
    if (!label) return;
    try {
      const r = await createRoom({
        documentId: doc.id,
        projectId: doc.projectId,
        label,
        bbox,
        source: 'manual',
      });
      setRooms((prev) => [...prev, r]);
      setMode('view');
    } catch (e) {
      alert((e as Error).message || 'Failed to save room');
    }
  };

  const handleRename = async (room: DrawingRoom) => {
    const next = prompt('Room label', room.label)?.trim();
    if (!next || next === room.label) return;
    await updateRoom(room.id, { label: next });
    setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, label: next } : r)));
    setActiveRoom((cur) => (cur?.id === room.id ? { ...cur, label: next } : cur));
  };

  const handleDeleteRoom = async (room: DrawingRoom) => {
    if (!confirm(`Delete "${room.label}"? Photos in this room will also be removed.`)) return;
    await deleteRoom(room.id);
    setRooms((prev) => prev.filter((r) => r.id !== room.id));
    if (activeRoom?.id === room.id) setActiveRoom(null);
  };

  if (!doc) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-blue-gray">
        <div className="text-center">
          <p>Drawing not found.</p>
          <button onClick={() => router.back()} className="mt-2 text-steel-blue underline">Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-dark-navy text-white">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-white/5 border-b border-light-gray dark:border-white/10 text-dark-navy dark:text-white">
        <Link href={`/project/${projectId}`} className="p-1 rounded hover:bg-frost-white dark:hover:bg-white/10">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate">{doc.name}</h1>
          <p className="text-xs text-slate-blue-gray">{rooms.length} room{rooms.length === 1 ? '' : 's'}</p>
        </div>
        <button
          onClick={() => setMode((m) => (m === 'draw' ? 'view' : 'draw'))}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold ${
            mode === 'draw'
              ? 'border-steel-blue text-steel-blue bg-steel-blue/10'
              : 'border-light-gray dark:border-white/10 text-slate-blue-gray hover:bg-frost-white dark:hover:bg-white/10'
          }`}
        >
          <Plus className="w-4 h-4" />
          {mode === 'draw' ? 'Drawing… click toolbar to cancel' : 'Add room'}
        </button>
      </header>

      {/* Canvas */}
      <div
        ref={containerRef}
        className={`relative flex-1 overflow-hidden ${mode === 'draw' ? 'cursor-crosshair' : ''}`}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onCanvasMouseMove}
        onMouseUp={onCanvasMouseUp}
        onMouseLeave={() => { if (drawStart) onCanvasMouseUp(); }}
      >
        {drawingUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={drawingUrl}
            alt={doc.name}
            className="w-full h-full object-contain select-none pointer-events-none"
            draggable={false}
            onLoad={(e) => {
              const t = e.currentTarget;
              setImgNatural({ w: t.naturalWidth, h: t.naturalHeight });
            }}
          />
        ) : null}

        {displayRect && rooms.map((room) => {
          const x = displayRect.x + room.bbox.x * displayRect.w;
          const y = displayRect.y + room.bbox.y * displayRect.h;
          const w = room.bbox.w * displayRect.w;
          const h = room.bbox.h * displayRect.h;
          return (
            <button
              key={room.id}
              onClick={() => mode === 'view' && setActiveRoom(room)}
              className="absolute group rounded-sm border-[1.5px] flex items-center justify-center"
              style={{
                left: x, top: y, width: w, height: h,
                backgroundColor: OVERLAY_BG,
                borderColor: OVERLAY_BORDER,
              }}
            >
              <span className="inline-block px-1.5 py-0.5 text-[11px] font-semibold text-white bg-dark-navy/85 rounded">
                {room.label}
              </span>
            </button>
          );
        })}

        {drawRect && (
          <div
            className="absolute rounded-sm border-[1.5px] border-dashed pointer-events-none"
            style={{
              left: drawRect.x, top: drawRect.y, width: drawRect.w, height: drawRect.h,
              backgroundColor: 'rgba(80, 150, 220, 0.18)',
              borderColor: OVERLAY_BORDER,
            }}
          />
        )}

        {renderingPdf && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
            <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
            <p className="mt-2 text-sm font-semibold">Rendering PDF page…</p>
          </div>
        )}

        {loadingRooms && (
          <div className="absolute top-3 right-3 flex items-center gap-2 px-2 py-1 rounded bg-black/30 text-xs">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading rooms…
          </div>
        )}
      </div>

      <footer className="px-4 py-2 bg-white dark:bg-white/5 border-t border-light-gray dark:border-white/10 text-center text-xs text-slate-blue-gray">
        {mode === 'draw'
          ? 'Drag on the drawing to outline a room.'
          : rooms.length === 0
            ? 'Click “Add room” to outline rooms manually.'
            : 'Click a room to add photos.'}
      </footer>

      {activeRoom && (
        <RoomDrawer
          room={activeRoom}
          onClose={() => setActiveRoom(null)}
          onRename={() => handleRename(activeRoom)}
          onDelete={() => handleDeleteRoom(activeRoom)}
        />
      )}
    </div>
  );
}

function clamp01(n: number) {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/* ---------------- Room photo drawer ---------------- */

function RoomDrawer({
  room, onClose, onRename, onDelete,
}: {
  room: DrawingRoom;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [photos, setPhotos] = useState<RoomPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<RoomPhoto | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setLoading(true);
    listRoomPhotos(room.id)
      .then(setPhotos)
      .catch((e) => alert((e as Error).message || 'Failed to load photos'))
      .finally(() => setLoading(false));
  }, [room.id]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploads = await Promise.all(
        Array.from(files).map((f) =>
          uploadRoomPhoto({ roomId: room.id, projectId: room.projectId, file: f })
        )
      );
      setPhotos((prev) => [...uploads, ...prev]);
    } catch (e) {
      alert((e as Error).message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photo: RoomPhoto) => {
    if (!confirm('Remove this photo from the room?')) return;
    await deleteRoomPhoto(photo);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center sm:justify-end bg-black/40" onClick={onClose}>
      <div
        className="room-sheet w-full sm:max-w-md h-[80vh] sm:h-[90vh] text-dark-navy dark:text-white flex flex-col rounded-t-2xl sm:rounded-2xl sm:m-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-light-gray dark:border-white/10">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{room.label}</h2>
            <p className="text-xs text-slate-blue-gray">
              {photos.length} photo{photos.length === 1 ? '' : 's'} · {room.source === 'ai' ? 'AI detected' : 'Manual'}
            </p>
          </div>
          <button onClick={onRename} className="text-xs font-semibold text-steel-blue px-2 py-1 hover:underline">
            Rename
          </button>
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-frost-white dark:hover:bg-white/5">
            <Trash2 className="w-4 h-4 text-rejected" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-frost-white dark:hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 py-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-steel-blue text-steel-blue text-sm font-semibold hover:bg-frost-white dark:hover:bg-white/5 disabled:opacity-60"
          >
            <Upload className="w-4 h-4" /> Upload
          </button>
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-steel-blue text-steel-blue text-sm font-semibold hover:bg-frost-white dark:hover:bg-white/5 disabled:opacity-60"
          >
            <Camera className="w-4 h-4" /> Photo
          </button>
          {uploading && <Loader2 className="w-4 h-4 animate-spin text-steel-blue" />}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-slate-blue-gray" />
            </div>
          ) : photos.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-blue-gray">
              No photos yet. Upload one to start.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreview(p)}
                  onContextMenu={(e) => { e.preventDefault(); handleDeletePhoto(p); }}
                  className="relative aspect-square rounded-lg overflow-hidden bg-frost-white dark:bg-white/5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.name || 'room photo'} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {preview && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setPreview(null)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.url} alt={preview.name || 'photo'} className="max-w-full max-h-full object-contain" />
          </div>
        )}
      </div>
    </div>
  );
}
