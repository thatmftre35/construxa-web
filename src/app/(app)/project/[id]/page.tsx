'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Home,
  FileText,
  MapPin,
  CheckSquare,
  Clock,
  Info,
  Upload,
  Camera,
  Wrench,
  FolderOpen,
  File,
  Image as ImageIcon,
  Cloud,
  X,
  Download,
  Share2,
  Search,
  Shield,
  Box,
  Users,
  Footprints,
  FlaskConical,
  Truck,
  Package,
  DollarSign,
  Calendar,
  Pencil,
  Check,
  Plus,
  Trash2,
  FolderInput,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import type { ProjectDocument } from '@/stores/projectStore';
import type { Project } from '@/types/project';
import { useProjectStore } from '@/stores/projectStore';
import { useTaskStore } from '@/stores/taskStore';
import { useEventStore } from '@/stores/eventStore';
import { formatEventDate } from '@/lib/dateUtils';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import ShareModal from '@/components/project/ShareModal';
import CreateEventModal from '@/components/modals/CreateEventModal';
import CreateTaskModal from '@/components/modals/CreateTaskModal';

const EVENT_TYPE_ICONS: Record<string, typeof Search> = {
  inspection: Search,
  deadline: Clock,
  safety_training: Shield,
  concrete_pour: Box,
  meeting: Users,
  walkthrough: Footprints,
  testing: FlaskConical,
  equipment_delivery: Truck,
  material_delivery: Package,
  financial: DollarSign,
  other: Calendar,
};

type TabId = 'dashboard' | 'documents';

interface DocumentFolder {
  name: string;
  icon: React.ReactNode;
  count: number;
}

const DEFAULT_FOLDERS: DocumentFolder[] = [
  { name: 'Drawings', icon: <FileText className="w-6 h-6" />, count: 0 },
  { name: 'Site Photos', icon: <ImageIcon className="w-6 h-6" />, count: 0 },
  { name: 'Submittals', icon: <FolderOpen className="w-6 h-6" />, count: 0 },
  { name: 'RFIs', icon: <FileText className="w-6 h-6" />, count: 0 },
  { name: 'Contracts', icon: <File className="w-6 h-6" />, count: 0 },
  { name: 'Reports', icon: <FileText className="w-6 h-6" />, count: 0 },
];

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' as const },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}



export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const projects = useProjectStore((s) => s.projects);
  const isLoaded = useProjectStore((s) => s.isLoaded);
  const documents = useProjectStore((s) => s.documents);
  const uploadDocument = useProjectStore((s) => s.uploadDocument);
  const fetchDocuments = useProjectStore((s) => s.fetchDocuments);

  // Fetch documents from DB on mount
  useEffect(() => {
    if (projectId) fetchDocuments(projectId);
  }, [projectId, fetchDocuments]);

  const deleteDocuments = useProjectStore((s) => s.deleteDocuments);
  const moveDocuments = useProjectStore((s) => s.moveDocuments);
  const renameDocument = useProjectStore((s) => s.renameDocument);

  const storeProject = projects.find((p) => p.id === projectId);
  const storeDocuments = documents.filter((d) => d.projectId === projectId);
  const project = storeProject;

  const updateProject = useProjectStore((s) => s.updateProject);
  const allTasks = useTaskStore((s) => s.tasks);
  const allEvents = useEventStore((s) => s.events);

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Project>>({});
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-ice-blue border-t-steel-blue rounded-full animate-spin" />
          <p className="text-sm text-slate-blue-gray">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-dark-navy mb-2">Project not found</h2>
          <Link href="/dashboard" className="text-steel-blue hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const projectTasks = allTasks.filter((t) => t.projectId === projectId);
  const projectEvents = allEvents.filter((e) => e.projectId === projectId);

  const fullAddress = `${project.address}, ${project.city}, ${project.state}`;

  const doUploadFiles = async (files: File[], folder: string) => {
    setUploading(true);
    setUploadSuccess(null);
    try {
      const results = await Promise.all(
        files.map((file) => uploadDocument(projectId, file, folder).catch(() => null))
      );
      const uploaded = results.filter(Boolean);
      if (uploaded.length === 1) {
        setUploadSuccess(`"${uploaded[0]!.name}" uploaded successfully`);
      } else if (uploaded.length > 1) {
        setUploadSuccess(`${uploaded.length} files uploaded successfully`);
      }
      setTimeout(() => setUploadSuccess(null), 3000);
    } catch {
      console.warn('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);

    if (selectedFolder) {
      await doUploadFiles(fileList, selectedFolder);
    } else {
      setPendingFiles(fileList);
      setShowFolderPicker(true);
    }
  };

  const handleFolderPickForUpload = async (folder: string) => {
    setShowFolderPicker(false);
    if (pendingFiles.length > 0) {
      await doUploadFiles(pendingFiles, folder);
      setPendingFiles([]);
    }
  };

  const startEditing = () => {
    setEditForm({
      name: project.name,
      address: project.address,
      city: project.city,
      state: project.state,
      description: project.description,
      value: project.value,
      startDate: project.startDate,
      stage: project.stage,
      sector: project.sector,
      squareFootage: project.squareFootage,
    });
    setIsEditing(true);
  };

  const discardEdits = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const saveEdits = async () => {
    setSaving(true);
    try {
      await updateProject(projectId, editForm);
      setIsEditing(false);
      setEditForm({});
    } catch (err) {
      console.warn('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="max-w-[1400px] mx-auto px-6 pt-6">
      <div className="card !p-0">
        <div className="px-6 py-5">
          <div className="flex items-start gap-4">
            <Link
              href="/dashboard"
              className="mt-1 p-2 rounded-xl hover:bg-white/40 dark:hover:bg-white/5 transition-colors text-slate-blue-gray"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-dark-navy">{project.name}</h1>
                <Badge status="active" label="Active" size="small" />
              </div>
              <p className="text-sm text-slate-blue-gray mt-1">{project.stage}</p>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={discardEdits}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rejected/10 text-rejected text-sm font-medium hover:bg-rejected/20 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Discard
                  </button>
                  <button
                    onClick={saveEdits}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-approved text-white text-sm font-medium hover:bg-approved/90 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={startEditing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/8 text-sm font-medium hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-steel-blue text-white text-sm font-medium hover:bg-dark-navy transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="px-6 border-t border-white/40 dark:border-white/6">
          <div className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 pt-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-steel-blue text-steel-blue'
                    : 'border-transparent text-slate-blue-gray hover:text-dark-navy'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      </div>

      {/* Modals */}
      {showShareModal && (
        <ShareModal
          projectId={projectId}
          projectName={project.name}
          onClose={() => setShowShareModal(false)}
        />
      )}
      {showFolderPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-80 max-h-[70vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Choose Folder</h3>
            <div className="space-y-2">
              {DEFAULT_FOLDERS.map((f) => (
                <button
                  key={f.name}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                  onClick={() => handleFolderPickForUpload(f.name)}
                >
                  {f.name}
                </button>
              ))}
            </div>
            <button
              className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              onClick={() => { setShowFolderPicker(false); setPendingFiles([]); if (fileInputRef.current) fileInputRef.current.value = ''; }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <CreateEventModal
        open={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        initialProjectId={projectId}
        initialProjectName={project.name}
      />
      <CreateTaskModal
        open={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        initialProjectId={projectId}
        initialProjectName={project.name}
      />

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        {activeTab === 'dashboard' ? (
          <DashboardTab
            project={project}
            fullAddress={fullAddress}
            tasks={projectTasks}
            events={projectEvents}
            documentCount={storeDocuments.length}
            isEditing={isEditing}
            editForm={editForm}
            setEditForm={setEditForm}
            onAddEvent={() => setShowCreateEvent(true)}
            onAddTask={() => setShowCreateTask(true)}
          />
        ) : (
          <DocumentsTab
            documents={storeDocuments}
            selectedFolder={selectedFolder}
            setSelectedFolder={setSelectedFolder}
            uploading={uploading}
            uploadSuccess={uploadSuccess}
            fileInputRef={fileInputRef}
            onFileUpload={handleFileUpload}
            onDeleteDocuments={deleteDocuments}
            onMoveDocuments={moveDocuments}
            onRenameDocument={renameDocument}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard Tab                                                      */
/* ------------------------------------------------------------------ */

function DashboardTab({
  project,
  fullAddress,
  tasks,
  events: projectEvents,
  documentCount,
  isEditing,
  editForm,
  setEditForm,
  onAddEvent,
  onAddTask,
}: {
  project: Project;
  fullAddress: string;
  tasks: import('@/types/project').Task[];
  events: import('@/types/project').Event[];
  documentCount: number;
  isEditing: boolean;
  editForm: Partial<Project>;
  setEditForm: (f: Partial<Project>) => void;
  onAddEvent: () => void;
  onAddTask: () => void;
}) {
  const ef = (field: keyof Project) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setEditForm({ ...editForm, [field]: e.target.value });
  };

  const STAGES = ['Planning', 'Pre-Construction', 'Construction', 'Post-Construction', 'Completed'];
  const SECTORS = ['General', 'Residential', 'Commercial', 'Industrial', 'Infrastructure', 'Healthcare', 'Education'];

  return (
    <>
      {/* Overview */}
      <motion.div {...fadeUp}>
        <Card>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Address</label>
                <input className="input-field w-full" value={editForm.address || ''} onChange={ef('address')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-blue-gray mb-1 block">City</label>
                  <input className="input-field w-full" value={editForm.city || ''} onChange={ef('city')} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-blue-gray mb-1 block">State</label>
                  <input className="input-field w-full" value={editForm.state || ''} onChange={ef('state')} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Description</label>
                <textarea className="input-field w-full" rows={2} value={editForm.description || ''} onChange={ef('description')} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Value</label>
                  <input className="input-field w-full" value={editForm.value || ''} onChange={ef('value')} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Start Date</label>
                  <input type="date" className="input-field w-full" value={editForm.startDate?.slice(0, 10) || ''} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Name</label>
                  <input className="input-field w-full" value={editForm.name || ''} onChange={ef('name')} />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 text-slate-blue-gray mb-3">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="text-sm">{fullAddress}</span>
              </div>
              <p className="text-sm text-dark-navy mb-5">{project.description}</p>

              <div className="grid grid-cols-3 gap-4 mb-5">
                <div>
                  <p className="text-xs text-slate-blue-gray mb-1">Value</p>
                  <p className="text-sm font-semibold text-dark-navy">{project.value || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-blue-gray mb-1">Start Date</p>
                  <p className="text-sm font-semibold text-dark-navy">{formatDate(project.startDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-blue-gray mb-1">Complete</p>
                  <p className="text-sm font-semibold text-dark-navy">
                    {Math.round(project.progress * 100)}%
                  </p>
                </div>
              </div>

              <div className="w-full h-2 bg-light-gray rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-steel-blue rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${project.progress * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </>
          )}
        </Card>
      </motion.div>

      {/* Upcoming Tasks */}
      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
        <div className="flex items-center justify-between">
          <SectionHeader
            icon={<CheckSquare className="w-5 h-5" />}
            title="Upcoming Tasks"
            count={tasks.length}
          />
          <button onClick={onAddTask} className="flex items-center gap-1 text-xs font-medium text-steel-blue hover:text-dark-navy transition-colors">
            <Plus size={14} /> New Task
          </button>
        </div>
        {tasks.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-blue-gray text-center py-6">
              No tasks for this project yet.{' '}
              <button onClick={onAddTask} className="text-steel-blue font-medium hover:underline">Create one</button>
            </p>
          </Card>
        ) : (
          <Card padding={false}>
            <div className="divide-y divide-light-gray">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 px-5 py-4">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${task.urgency === 'high' ? 'bg-rejected' : task.urgency === 'moderate' ? 'bg-pending' : 'bg-approved'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-navy truncate">{task.title}</p>
                    <p className="text-xs text-slate-blue-gray mt-0.5">
                      {task.assignee || 'Unassigned'} &middot; {formatEventDate(task.dueDate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </motion.div>

      {/* Events */}
      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
        <div className="flex items-center justify-between">
          <SectionHeader
            icon={<Clock className="w-5 h-5" />}
            title="Events"
            count={projectEvents.length}
          />
          <button onClick={onAddEvent} className="flex items-center gap-1 text-xs font-medium text-steel-blue hover:text-dark-navy transition-colors">
            <Plus size={14} /> New Event
          </button>
        </div>
        {projectEvents.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-blue-gray text-center py-6">
              No events yet.{' '}
              <button onClick={onAddEvent} className="text-steel-blue font-medium hover:underline">Create one</button>
            </p>
          </Card>
        ) : (
          <Card padding={false}>
            <div className="divide-y divide-light-gray">
              {projectEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-3 px-5 py-4">
                  {(() => { const Icon = EVENT_TYPE_ICONS[event.type] || Calendar; return <Icon size={16} className="text-steel-blue shrink-0" />; })()}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-navy truncate">{event.description || event.type}</p>
                    <p className="text-xs text-slate-blue-gray mt-0.5">{formatEventDate(event.eventDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </motion.div>

      {/* Trades */}
      {project.trades && project.trades.length > 0 && (
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
          <SectionHeader icon={<Wrench className="w-5 h-5" />} title="Trades" />
          <div className="flex flex-wrap gap-2">
            {project.trades.map((trade) => (
              <span
                key={trade}
                className="px-3 py-1.5 text-sm font-medium text-steel-blue bg-white border border-light-gray rounded-full"
              >
                {trade}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Project Details */}
      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }}>
        <SectionHeader icon={<Info className="w-5 h-5" />} title="Project Details" />
        <Card padding={false}>
          {isEditing ? (
            <div className="divide-y divide-light-gray">
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-slate-blue-gray">Stage</span>
                <select className="input-field w-48 text-right text-sm" value={editForm.stage || ''} onChange={ef('stage')}>
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-slate-blue-gray">Sector</span>
                <select className="input-field w-48 text-right text-sm" value={editForm.sector || ''} onChange={ef('sector')}>
                  {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-slate-blue-gray">Sq. Footage</span>
                <input className="input-field w-48 text-right text-sm" value={editForm.squareFootage || ''} onChange={ef('squareFootage')} placeholder="e.g. 2500" />
              </div>
              <DetailRow label="Documents" value={String(documentCount)} />
            </div>
          ) : (
            <div className="divide-y divide-light-gray">
              <DetailRow label="Stage" value={project.stage} />
              <DetailRow label="Sector" value={project.sector} />
              <DetailRow label="Sq. Footage" value={project.squareFootage ? `${project.squareFootage} sq ft` : '—'} />
              <DetailRow label="Documents" value={String(documentCount)} />
            </div>
          )}
        </Card>
      </motion.div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Documents Tab                                                      */
/* ------------------------------------------------------------------ */

function DocumentsTab({
  documents,
  selectedFolder,
  setSelectedFolder,
  uploading,
  uploadSuccess,
  fileInputRef,
  onFileUpload,
  onDeleteDocuments,
  onMoveDocuments,
  onRenameDocument,
}: {
  documents: ProjectDocument[];
  selectedFolder: string | null;
  setSelectedFolder: (f: string | null) => void;
  uploading: boolean;
  uploadSuccess: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteDocuments: (ids: string[]) => Promise<void>;
  onMoveDocuments: (ids: string[], folder: string) => Promise<void>;
  onRenameDocument: (id: string, name: string) => Promise<void>;
}) {
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contextDoc, setContextDoc] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  const lastClickedIndex = useRef<number | null>(null);

  // Build folder list from defaults + custom + any folders found in documents
  const docFolders = new Set(documents.map((d) => d.folder).filter(Boolean));
  const defaultFolderNames = DEFAULT_FOLDERS.map((f) => f.name);
  const discoveredFolders = [...docFolders].filter(
    (f) => !defaultFolderNames.includes(f) && !customFolders.includes(f)
  );

  const allFolderNames = [...defaultFolderNames, ...customFolders, ...discoveredFolders];

  // Get subfolders of current folder (from docs AND custom folders)
  const getSubfolders = (parent: string) => {
    const prefix = parent + '/';
    const subs = new Set<string>();
    // From document folder paths
    documents.forEach((d) => {
      if (d.folder.startsWith(prefix)) {
        const rest = d.folder.slice(prefix.length);
        const next = rest.split('/')[0];
        if (next) subs.add(next);
      }
    });
    // From custom folders list
    allFolderNames.forEach((f) => {
      if (f.startsWith(prefix)) {
        const rest = f.slice(prefix.length);
        const next = rest.split('/')[0];
        if (next) subs.add(next);
      }
    });
    return [...subs];
  };

  // Folder path segments for breadcrumb
  const folderSegments = selectedFolder ? selectedFolder.split('/') : [];

  // Docs in current folder (exact match, not nested)
  const folderDocs = selectedFolder
    ? documents.filter((d) => d.folder === selectedFolder)
    : documents;

  const subfolders = selectedFolder ? getSubfolders(selectedFolder) : [];

  // Count docs in a folder (including subfolders)
  const countDocsInFolder = (folderName: string) => {
    return documents.filter(
      (d) => d.folder === folderName || d.folder.startsWith(folderName + '/')
    ).length;
  };

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    const currentIndex = folderDocs.findIndex((d) => d.id === id);

    if (e?.shiftKey && lastClickedIndex.current !== null && currentIndex !== -1) {
      const start = Math.min(lastClickedIndex.current, currentIndex);
      const end = Math.max(lastClickedIndex.current, currentIndex);
      const rangeIds = folderDocs.slice(start, end + 1).map((d) => d.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        rangeIds.forEach((rid) => next.add(rid));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
    lastClickedIndex.current = currentIndex;
  };

  const selectAll = () => {
    if (selectedIds.size === folderDocs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(folderDocs.map((d) => d.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleDelete = async () => {
    await onDeleteDocuments([...selectedIds]);
    setSelectedIds(new Set());
    setShowDeleteConfirm(false);
  };

  const handleMove = async (targetFolder: string) => {
    await onMoveDocuments([...selectedIds], targetFolder);
    setSelectedIds(new Set());
    setShowMoveModal(false);
  };

  const handleRename = async () => {
    if (renamingId && renameValue.trim()) {
      await onRenameDocument(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    const fullPath = selectedFolder ? `${selectedFolder}/${name}` : name;
    if (allFolderNames.includes(fullPath)) return;
    setCustomFolders([...customFolders, fullPath]);
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const handleDragStart = (docId: string) => {
    // If the dragged item is in the selection, drag all selected; otherwise just this one
    if (selectedIds.has(docId) && selectedIds.size > 1) {
      setDraggingIds([...selectedIds]);
    } else {
      setDraggingIds([docId]);
    }
  };

  const handleDragEnd = () => {
    setDraggingIds([]);
    setDragOverFolder(null);
  };

  const handleDropOnFolder = async (targetFolder: string) => {
    if (draggingIds.length > 0) {
      await onMoveDocuments(draggingIds, targetFolder);
      setSelectedIds(new Set());
    }
    setDraggingIds([]);
    setDragOverFolder(null);
  };

  const isSelecting = selectedIds.size > 0;

  return (
    <>
      {/* File Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="modal-container rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-light-gray dark:border-white/10">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-dark-navy truncate">{previewDoc.name}</p>
                <p className="text-xs text-slate-blue-gray mt-0.5">
                  {previewDoc.type.split('/')[1]?.toUpperCase() || 'FILE'} &middot; {formatFileSize(previewDoc.size)}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {previewDoc.url && (
                  <a href={previewDoc.url} download={previewDoc.name} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-frost-white dark:hover:bg-white/5 transition-colors text-slate-blue-gray">
                    <Download className="w-5 h-5" />
                  </a>
                )}
                <button onClick={() => setPreviewDoc(null)} className="p-2 rounded-lg hover:bg-frost-white dark:hover:bg-white/5 transition-colors text-slate-blue-gray">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-frost-white dark:bg-black/20 min-h-[300px]">
              {previewDoc.type.startsWith('image/') ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={previewDoc.url} alt={previewDoc.name} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
              ) : previewDoc.type === 'application/pdf' ? (
                <iframe src={previewDoc.url} className="w-full h-[70vh] rounded-lg border-0" title={previewDoc.name} />
              ) : previewDoc.type.startsWith('text/') ? (
                <iframe src={previewDoc.url} className="w-full h-[70vh] rounded-lg border-0 bg-white" title={previewDoc.name} />
              ) : (
                <div className="text-center py-12">
                  <File className="w-16 h-16 text-ice-blue mx-auto mb-4" />
                  <p className="text-sm text-slate-blue-gray mb-4">Preview not available for this file type</p>
                  <a href={previewDoc.url} download={previewDoc.name} target="_blank" rel="noopener noreferrer"
                    className="btn-primary inline-flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Move Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowMoveModal(false)}>
          <div className="modal-container rounded-2xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-light-gray dark:border-white/10">
              <h3 className="text-base font-semibold text-dark-navy">Move to Folder</h3>
              <button onClick={() => setShowMoveModal(false)} className="p-1.5 rounded-lg hover:bg-frost-white dark:hover:bg-white/5 text-slate-blue-gray">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 max-h-72 overflow-y-auto">
              <button
                onClick={() => handleMove('')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-frost-white dark:hover:bg-white/5 transition-colors text-left"
              >
                <FolderOpen className="w-5 h-5 text-slate-blue-gray" />
                <span className="text-sm text-dark-navy font-medium">Root (no folder)</span>
              </button>
              {allFolderNames.map((f) => (
                <button
                  key={f}
                  onClick={() => handleMove(f)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-frost-white dark:hover:bg-white/5 transition-colors text-left ${
                    f === selectedFolder ? 'bg-frost-white dark:bg-white/5' : ''
                  }`}
                >
                  <FolderOpen className="w-5 h-5 text-steel-blue" />
                  <span className="text-sm text-dark-navy">{f}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-container rounded-2xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-5 text-center">
              <Trash2 className="w-10 h-10 text-rejected mx-auto mb-3" />
              <h3 className="text-base font-semibold text-dark-navy mb-1">Delete {selectedIds.size} file{selectedIds.size > 1 ? 's' : ''}?</h3>
              <p className="text-sm text-slate-blue-gray mb-5">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-light-gray dark:border-white/10 text-sm font-medium text-dark-navy hover:bg-frost-white dark:hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rejected text-white text-sm font-medium hover:bg-rejected/90 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selection Action Bar */}
      {isSelecting && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 rounded-xl bg-steel-blue/10 dark:bg-steel-blue/20 border border-steel-blue/20"
        >
          <button onClick={selectAll} className="text-sm font-medium text-steel-blue hover:underline">
            {selectedIds.size === folderDocs.length ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-sm text-slate-blue-gray">
            {selectedIds.size} selected
          </span>
          <div className="flex-1" />
          <button onClick={() => setShowMoveModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-steel-blue text-white text-sm font-medium hover:bg-dark-navy transition-colors">
            <FolderInput className="w-4 h-4" />
            Move
          </button>
          <button onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rejected text-white text-sm font-medium hover:bg-rejected/90 transition-colors">
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button onClick={clearSelection}
            className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-white/5 text-slate-blue-gray">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Upload Bar */}
      <motion.div {...fadeUp}>
        <div className="flex gap-3">
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-ice-blue rounded-xl text-sm font-medium text-steel-blue hover:bg-frost-white transition-colors disabled:opacity-50">
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-ice-blue rounded-xl text-sm font-medium text-steel-blue hover:bg-frost-white transition-colors disabled:opacity-50">
            <Camera className="w-4 h-4" />
            Photo
          </button>
        </div>
        <input ref={fileInputRef} type="file" className="hidden" onChange={onFileUpload} accept="*/*" multiple />
        {uploadSuccess && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-approved font-medium mt-3">
            {uploadSuccess}
          </motion.p>
        )}
      </motion.div>

      {/* Breadcrumb */}
      {selectedFolder && (
        <motion.div {...fadeUp} className="flex items-center gap-1 text-sm flex-wrap">
          <button onClick={() => setSelectedFolder(null)} className="text-steel-blue hover:underline">
            All Folders
          </button>
          {folderSegments.map((seg, i) => {
            const path = folderSegments.slice(0, i + 1).join('/');
            const isLast = i === folderSegments.length - 1;
            return (
              <span key={path} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-slate-blue-gray" />
                {isLast ? (
                  <span className="text-dark-navy font-medium">{seg}</span>
                ) : (
                  <button onClick={() => setSelectedFolder(path)} className="text-steel-blue hover:underline">
                    {seg}
                  </button>
                )}
              </span>
            );
          })}
        </motion.div>
      )}

      {/* Folder Grid */}
      {!selectedFolder && (
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DEFAULT_FOLDERS.map((folder) => (
              <button key={folder.name} onClick={() => setSelectedFolder(folder.name)}
                onDragOver={(e) => { e.preventDefault(); setDragOverFolder(folder.name); }}
                onDragLeave={() => setDragOverFolder(null)}
                onDrop={(e) => { e.preventDefault(); handleDropOnFolder(folder.name); }}
                className={`card-subtle flex flex-col items-center gap-2 py-5 hover:shadow-md transition-all text-center ${
                  dragOverFolder === folder.name ? 'ring-2 ring-steel-blue scale-[1.03]' : ''
                }`}>
                <div className="text-steel-blue">{folder.icon}</div>
                <p className="text-sm font-medium text-dark-navy">{folder.name}</p>
                <p className="text-xs text-slate-blue-gray">{countDocsInFolder(folder.name)} files</p>
              </button>
            ))}
            {[...customFolders, ...discoveredFolders]
              .filter((f) => !f.includes('/'))
              .map((f) => (
                <button key={f} onClick={() => setSelectedFolder(f)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverFolder(f); }}
                  onDragLeave={() => setDragOverFolder(null)}
                  onDrop={(e) => { e.preventDefault(); handleDropOnFolder(f); }}
                  className={`card-subtle flex flex-col items-center gap-2 py-5 hover:shadow-md transition-all text-center ${
                    dragOverFolder === f ? 'ring-2 ring-steel-blue scale-[1.03]' : ''
                  }`}>
                  <FolderOpen className="w-6 h-6 text-steel-blue" />
                  <p className="text-sm font-medium text-dark-navy">{f}</p>
                  <p className="text-xs text-slate-blue-gray">{countDocsInFolder(f)} files</p>
                </button>
              ))}
            {showNewFolder ? (
              <div className="card-subtle flex flex-col items-center gap-2 py-4 text-center">
                <FolderOpen className="w-6 h-6 text-steel-blue" />
                <input autoFocus value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
                  placeholder="Folder name" className="input-field text-center text-sm w-full px-2 py-1" />
                <div className="flex gap-1.5">
                  <button onClick={handleCreateFolder} className="text-xs font-medium text-approved hover:underline">Create</button>
                  <button onClick={() => setShowNewFolder(false)} className="text-xs font-medium text-slate-blue-gray hover:underline">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowNewFolder(true)}
                className="card-subtle flex flex-col items-center justify-center gap-2 py-5 border-2 border-dashed border-ice-blue hover:border-steel-blue transition-colors text-center">
                <Plus className="w-6 h-6 text-ice-blue" />
                <p className="text-sm font-medium text-slate-blue-gray">New Folder</p>
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Subfolders (when inside a folder) */}
      {selectedFolder && subfolders.length > 0 && (
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
          <SectionHeader icon={<FolderOpen className="w-5 h-5" />} title="Subfolders" count={subfolders.length} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {subfolders.map((sub) => {
              const fullPath = `${selectedFolder}/${sub}`;
              return (
                <button key={sub} onClick={() => setSelectedFolder(fullPath)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverFolder(fullPath); }}
                  onDragLeave={() => setDragOverFolder(null)}
                  onDrop={(e) => { e.preventDefault(); handleDropOnFolder(fullPath); }}
                  className={`card-subtle flex flex-col items-center gap-2 py-4 hover:shadow-md transition-all text-center ${
                    dragOverFolder === fullPath ? 'ring-2 ring-steel-blue scale-[1.03]' : ''
                  }`}>
                  <FolderOpen className="w-6 h-6 text-steel-blue" />
                  <p className="text-sm font-medium text-dark-navy">{sub}</p>
                  <p className="text-xs text-slate-blue-gray">{countDocsInFolder(fullPath)} files</p>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* New Subfolder button (when inside a folder) */}
      {selectedFolder && (
        <motion.div {...fadeUp}>
          {showNewFolder ? (
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-steel-blue shrink-0" />
              <input autoFocus value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName(''); } }}
                placeholder="Subfolder name" className="input-field text-sm flex-1" />
              <button onClick={handleCreateFolder} className="text-xs font-medium text-approved hover:underline">Create</button>
              <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="text-xs font-medium text-slate-blue-gray hover:underline">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-2 text-sm text-steel-blue hover:underline font-medium">
              <Plus className="w-4 h-4" />
              New Subfolder
            </button>
          )}
        </motion.div>
      )}

      {/* Files List */}
      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
        <SectionHeader
          icon={<FileText className="w-5 h-5" />}
          title={selectedFolder || 'All Files'}
          count={folderDocs.length}
        />

        {folderDocs.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <FolderOpen className="w-10 h-10 text-ice-blue mx-auto mb-3" />
              <p className="text-sm text-slate-blue-gray mb-4">
                {selectedFolder ? 'No documents in this folder' : 'No documents yet'}
              </p>
              <button onClick={() => fileInputRef.current?.click()}
                className="btn-primary inline-flex items-center gap-2 w-auto">
                <Upload className="w-4 h-4" />
                Upload Document
              </button>
            </div>
          </Card>
        ) : (
          <Card padding={false}>
            <div className="divide-y divide-light-gray dark:divide-white/6">
              {folderDocs.map((doc) => {
                const isImage = doc.type.startsWith('image/');
                const isSelected = selectedIds.has(doc.id);
                const isRenaming = renamingId === doc.id;
                return (
                  <div key={doc.id}
                    draggable
                    onDragStart={() => handleDragStart(doc.id)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 px-5 py-3 transition-colors cursor-grab active:cursor-grabbing ${
                    isSelected ? 'bg-steel-blue/5 dark:bg-steel-blue/10' : 'hover:bg-frost-white dark:hover:bg-white/3'
                  } ${draggingIds.includes(doc.id) ? 'opacity-50' : ''}`}>
                    {/* Selection Checkbox */}
                    <button onClick={(e) => toggleSelect(doc.id, e)} className="shrink-0">
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-steel-blue" />
                      ) : (
                        <Circle className="w-5 h-5 text-ice-blue hover:text-steel-blue transition-colors" />
                      )}
                    </button>

                    {/* Thumbnail */}
                    <button onClick={() => !isRenaming && setPreviewDoc(doc)} className="shrink-0">
                      {isImage ? (
                        <div className="w-10 h-10 rounded-lg bg-frost-white overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-frost-white dark:bg-white/5 flex items-center justify-center">
                          <File className="w-5 h-5 text-steel-blue" />
                        </div>
                      )}
                    </button>

                    {/* Info */}
                    <button onClick={() => !isRenaming && setPreviewDoc(doc)} className="flex-1 min-w-0 text-left">
                      {isRenaming ? (
                        <input autoFocus value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); } }}
                          onBlur={handleRename}
                          className="input-field text-sm w-full" />
                      ) : (
                        <>
                          <p className="text-sm font-medium text-dark-navy truncate">{doc.name}</p>
                          <p className="text-xs text-slate-blue-gray mt-0.5">
                            {doc.type.split('/')[1]?.toUpperCase() || 'FILE'} &middot;{' '}
                            {formatDate(doc.uploadedAt)} &middot; {formatFileSize(doc.size)}
                          </p>
                        </>
                      )}
                    </button>

                    {doc.storagePath && (
                      <span className="flex items-center gap-1 text-xs text-approved font-medium shrink-0">
                        <Cloud className="w-3 h-3" />
                      </span>
                    )}

                    {/* Context Menu */}
                    <div className="relative shrink-0">
                      <button onClick={() => setContextDoc(contextDoc === doc.id ? null : doc.id)}
                        className="p-1.5 rounded-lg hover:bg-frost-white dark:hover:bg-white/5 text-slate-blue-gray transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {contextDoc === doc.id && (
                        <div className="context-menu absolute right-0 top-full mt-1 z-20 w-40 py-1 rounded-xl shadow-lg border border-light-gray dark:border-white/10">
                          <button onClick={() => { setPreviewDoc(doc); setContextDoc(null); }}
                            className="w-full px-3 py-2 text-left text-sm text-dark-navy hover:bg-frost-white dark:hover:bg-white/5 transition-colors">
                            Preview
                          </button>
                          <button onClick={() => { setRenamingId(doc.id); setRenameValue(doc.name); setContextDoc(null); }}
                            className="w-full px-3 py-2 text-left text-sm text-dark-navy hover:bg-frost-white dark:hover:bg-white/5 transition-colors">
                            Rename
                          </button>
                          <button onClick={() => { setSelectedIds(new Set([doc.id])); setShowMoveModal(true); setContextDoc(null); }}
                            className="w-full px-3 py-2 text-left text-sm text-dark-navy hover:bg-frost-white dark:hover:bg-white/5 transition-colors">
                            Move to...
                          </button>
                          {doc.url && (
                            <a href={doc.url} download={doc.name} target="_blank" rel="noopener noreferrer"
                              onClick={() => setContextDoc(null)}
                              className="block w-full px-3 py-2 text-left text-sm text-dark-navy hover:bg-frost-white dark:hover:bg-white/5 transition-colors">
                              Download
                            </a>
                          )}
                          <button onClick={() => { setSelectedIds(new Set([doc.id])); setShowDeleteConfirm(true); setContextDoc(null); }}
                            className="w-full px-3 py-2 text-left text-sm text-rejected hover:bg-frost-white dark:hover:bg-white/5 transition-colors">
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </motion.div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared Components                                                  */
/* ------------------------------------------------------------------ */

function SectionHeader({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-steel-blue">{icon}</span>
      <h2 className="text-base font-semibold text-dark-navy">{title}</h2>
      {count !== undefined && (
        <span className="text-xs font-medium text-slate-blue-gray bg-frost-white px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-sm text-slate-blue-gray">{label}</span>
      <span className="text-sm font-medium text-dark-navy">{value}</span>
    </div>
  );
}
