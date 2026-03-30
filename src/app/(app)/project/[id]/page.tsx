'use client';

import { useState, useRef } from 'react';
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
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { mockProjects, mockTasks, mockDeliveries } from '@/constants/mockData';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';

type TabId = 'dashboard' | 'documents';

interface DocumentFolder {
  name: string;
  icon: React.ReactNode;
  count: number;
}

const folders: DocumentFolder[] = [
  { name: 'Drawings', icon: <FileText className="w-6 h-6" />, count: 12 },
  { name: 'Site Photos', icon: <ImageIcon className="w-6 h-6" />, count: 48 },
  { name: 'Submittals', icon: <FolderOpen className="w-6 h-6" />, count: 8 },
  { name: 'RFIs', icon: <FileText className="w-6 h-6" />, count: 5 },
  { name: 'Contracts', icon: <File className="w-6 h-6" />, count: 3 },
  { name: 'Reports', icon: <FileText className="w-6 h-6" />, count: 7 },
];

const priorityColors: Record<string, string> = {
  urgent: '#FF3B30',
  high: '#FF6B35',
  medium: 'var(--color-pending)',
  low: '#34C759',
};

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

function mapTaskStatus(status: string): 'active' | 'pending' | 'overdue' | 'approved' {
  switch (status) {
    case 'completed': return 'approved';
    case 'in_progress': return 'active';
    case 'overdue': return 'overdue';
    default: return 'pending';
  }
}

function mapDeliveryStatus(status: string): 'active' | 'pending' {
  return status === 'scheduled' ? 'active' : 'pending';
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const projects = useProjectStore((s) => s.projects);
  const documents = useProjectStore((s) => s.documents);
  const uploadDocument = useProjectStore((s) => s.uploadDocument);

  const storeProject = projects.find((p) => p.id === projectId);
  const storeDocuments = documents.filter((d) => d.projectId === projectId);
  const project = storeProject ?? mockProjects.find((p) => p.id === projectId);

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const projectTasks = mockTasks.filter(
    (t) => t.projectId === projectId || t.projectName === project.name
  );

  const fullAddress = `${project.address}, ${project.city}, ${project.state}`;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadSuccess(null);
    try {
      const doc = await uploadDocument(projectId, file);
      if (doc) {
        setUploadSuccess(`"${doc.name}" uploaded successfully`);
        setTimeout(() => setUploadSuccess(null), 3000);
      }
    } catch {
      console.warn('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-frost-white">
      {/* Header */}
      <div className="bg-white border-b border-light-gray">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <div className="flex items-start gap-4">
            <Link
              href="/dashboard"
              className="mt-1 p-2 rounded-xl hover:bg-frost-white transition-colors text-slate-blue-gray"
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
          </div>
        </div>

        {/* Tab Bar */}
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
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

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {activeTab === 'dashboard' ? (
          <DashboardTab
            project={project}
            fullAddress={fullAddress}
            tasks={projectTasks}
            documentCount={storeDocuments.length}
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
  documentCount,
}: {
  project: NonNullable<ReturnType<typeof mockProjects.find>>;
  fullAddress: string;
  tasks: typeof mockTasks;
  documentCount: number;
}) {
  return (
    <>
      {/* Overview */}
      <motion.div {...fadeUp}>
        <Card>
          <div className="flex items-start gap-2 text-slate-blue-gray mb-3">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="text-sm">{fullAddress}</span>
          </div>
          <p className="text-sm text-dark-navy/80 mb-5">{project.description}</p>

          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <p className="text-xs text-slate-blue-gray mb-1">Value</p>
              <p className="text-sm font-semibold text-dark-navy">{project.value}</p>
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
        </Card>
      </motion.div>

      {/* Upcoming Tasks */}
      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
        <SectionHeader
          icon={<CheckSquare className="w-5 h-5" />}
          title="Upcoming Tasks"
          count={tasks.length}
        />
        {tasks.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-blue-gray text-center py-6">
              No tasks for this project yet.
            </p>
          </Card>
        ) : (
          <Card padding={false}>
            <div className="divide-y divide-light-gray">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 px-5 py-4">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: priorityColors[task.priority] }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-navy truncate">{task.title}</p>
                    <p className="text-xs text-slate-blue-gray mt-0.5">
                      {task.assignee} &middot; {formatDate(task.dueDate)}
                    </p>
                  </div>
                  <Badge status={mapTaskStatus(task.status)} size="small" />
                </div>
              ))}
            </div>
          </Card>
        )}
      </motion.div>

      {/* Deliveries */}
      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
        <SectionHeader
          icon={<Clock className="w-5 h-5" />}
          title="Deliveries"
          count={mockDeliveries.length}
        />
        <Card padding={false}>
          <div className="divide-y divide-light-gray">
            {mockDeliveries.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-5 py-4">
                <div className="w-9 h-9 rounded-xl bg-frost-white flex items-center justify-center shrink-0">
                  <Wrench className="w-4 h-4 text-steel-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-navy truncate">{d.item}</p>
                  <p className="text-xs text-slate-blue-gray mt-0.5">
                    {d.supplier} &middot; {d.date}
                  </p>
                </div>
                <Badge
                  status={mapDeliveryStatus(d.status)}
                  label={d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                  size="small"
                />
              </div>
            ))}
          </div>
        </Card>
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
          <div className="divide-y divide-light-gray">
            <DetailRow label="Stage" value={project.stage} />
            <DetailRow label="Sector" value={project.sector} />
            <DetailRow label="Sq. Footage" value={`${project.squareFootage} sq ft`} />
            <DetailRow label="Documents" value={String(documentCount)} />
          </div>
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
}: {
  documents: { id: string; projectId: string; name: string; url: string; type: string; size: number; uploadedAt: string; supabasePath?: string }[];
  selectedFolder: string | null;
  setSelectedFolder: (f: string | null) => void;
  uploading: boolean;
  uploadSuccess: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      {/* Upload Bar */}
      <motion.div {...fadeUp}>
        <div className="flex gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-ice-blue rounded-xl text-sm font-medium text-steel-blue hover:bg-frost-white transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-ice-blue rounded-xl text-sm font-medium text-steel-blue hover:bg-frost-white transition-colors disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            Photo
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={onFileUpload}
          accept="*/*"
        />

        {uploadSuccess && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-approved font-medium mt-3"
          >
            {uploadSuccess}
          </motion.p>
        )}
      </motion.div>

      {/* Breadcrumb */}
      {selectedFolder && (
        <motion.div {...fadeUp} className="flex items-center gap-1 text-sm">
          <button
            onClick={() => setSelectedFolder(null)}
            className="text-steel-blue hover:underline"
          >
            All Folders
          </button>
          <span className="text-slate-blue-gray">/</span>
          <span className="text-dark-navy font-medium">{selectedFolder}</span>
        </motion.div>
      )}

      {/* Folder Grid */}
      {!selectedFolder && (
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
          <div className="grid grid-cols-3 gap-3">
            {folders.map((folder) => (
              <button
                key={folder.name}
                onClick={() => setSelectedFolder(folder.name)}
                className="card-subtle flex flex-col items-center gap-2 py-5 hover:shadow-md transition-shadow text-center"
              >
                <div className="text-steel-blue">{folder.icon}</div>
                <p className="text-sm font-medium text-dark-navy">{folder.name}</p>
                <p className="text-xs text-slate-blue-gray">{folder.count} files</p>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Files List */}
      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
        <SectionHeader
          icon={<FileText className="w-5 h-5" />}
          title={selectedFolder ? `${selectedFolder}` : 'Recent Files'}
          count={documents.length}
        />

        {documents.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <FolderOpen className="w-10 h-10 text-ice-blue mx-auto mb-3" />
              <p className="text-sm text-slate-blue-gray mb-4">No documents yet</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary inline-flex items-center gap-2 w-auto"
              >
                <Upload className="w-4 h-4" />
                Upload Document
              </button>
            </div>
          </Card>
        ) : (
          <Card padding={false}>
            <div className="divide-y divide-light-gray">
              {documents.map((doc) => {
                const isImage = doc.type.startsWith('image/');
                return (
                  <div key={doc.id} className="flex items-center gap-3 px-5 py-3">
                    {isImage ? (
                      <div className="w-10 h-10 rounded-lg bg-frost-white overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={doc.url}
                          alt={doc.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-frost-white flex items-center justify-center shrink-0">
                        <File className="w-5 h-5 text-steel-blue" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark-navy truncate">{doc.name}</p>
                      <p className="text-xs text-slate-blue-gray mt-0.5">
                        {doc.type.split('/')[1]?.toUpperCase() || 'FILE'} &middot;{' '}
                        {formatDate(doc.uploadedAt)} &middot; {formatFileSize(doc.size)}
                      </p>
                    </div>
                    {doc.supabasePath && (
                      <span className="flex items-center gap-1 text-xs text-approved font-medium">
                        <Cloud className="w-3 h-3" />
                        Synced
                      </span>
                    )}
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
