'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, Search, Loader2, AlertCircle } from 'lucide-react';
import { useProjectStore, type ProjectDocument, type DocumentRevision } from '@/stores/projectStore';
import { useApprovalStore } from '@/stores/approvalStore';
import { getProjectMembers, type ProjectMember } from '@/lib/inbox';

interface RevisionListModalProps {
  open: boolean;
  onClose: () => void;
  document: ProjectDocument;
  projectId: string;
}

export default function RevisionListModal({ open, onClose, document: doc, projectId }: RevisionListModalProps) {
  const [revisions, setRevisions] = useState<DocumentRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [requestingFor, setRequestingFor] = useState<DocumentRevision | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRevisions = useProjectStore((s) => s.fetchRevisions);
  const uploadRevision = useProjectStore((s) => s.uploadRevision);
  const requestApproval = useApprovalStore((s) => s.requestApproval);
  const getRevisionApprovalStatus = useApprovalStore((s) => s.getRevisionApprovalStatus);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setRequestingFor(null);
      fetchRevisions(doc.id).then((revs) => {
        setRevisions(revs);
        setLoading(false);
      });
      getProjectMembers(projectId).then(setMembers);
    }
  }, [open, doc.id, projectId, fetchRevisions]);

  if (!open) return null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const rev = await uploadRevision(doc.id, file);
    if (rev) setRevisions((prev) => [...prev, rev]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleRequestApproval = async () => {
    if (!requestingFor || !selectedMember) return;
    setSubmitting(true);
    await requestApproval({
      documentId: doc.id,
      revisionId: requestingFor.id,
      projectId,
      approverId: selectedMember.userId,
    });
    setSubmitting(false);
    setRequestingFor(null);
    setSelectedMember(null);
    setSearch('');
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="modal-container rounded-2xl w-full max-w-lg shadow-xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-light-gray dark:border-white/10 shrink-0">
          <div>
            <h3 className="text-base font-semibold text-dark-navy">{doc.name}</h3>
            <p className="text-xs text-slate-blue-gray mt-0.5">{revisions.length} revision{revisions.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-frost-white dark:hover:bg-white/5 text-slate-blue-gray">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {requestingFor ? (
            /* Request approval for a revision */
            <div>
              <p className="text-sm text-slate-blue-gray mb-1">
                Request approval for <strong className="text-dark-navy">Revision {requestingFor.revisionNumber}</strong>
              </p>
              <p className="text-xs text-slate-blue-gray mb-3">{requestingFor.name}</p>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-blue-gray" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field pl-10 text-sm"
                />
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1 mb-4">
                {filtered.map((m) => (
                  <button
                    key={m.userId}
                    onClick={() => setSelectedMember(m)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                      selectedMember?.userId === m.userId
                        ? 'bg-steel-blue/10 border border-steel-blue/30'
                        : 'hover:bg-frost-white dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-steel-blue text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {m.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-dark-navy truncate">{m.name}</p>
                      <p className="text-xs text-slate-blue-gray truncate">{m.email}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setRequestingFor(null); setSelectedMember(null); setSearch(''); }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-light-gray dark:border-white/10 text-sm font-medium text-dark-navy">
                  Back
                </button>
                <button onClick={handleRequestApproval} disabled={!selectedMember || submitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-steel-blue text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Request
                </button>
              </div>
            </div>
          ) : (
            /* Revision list */
            <>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-steel-blue" />
                </div>
              ) : (
                <div className="space-y-2">
                  {revisions.map((rev) => {
                    const status = getRevisionApprovalStatus(rev.id);
                    return (
                      <div key={rev.id} className="flex items-center gap-3 p-3 rounded-xl bg-frost-white dark:bg-white/5 border border-white/60 dark:border-white/8">
                        <div className="w-9 h-9 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-steel-blue" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-dark-navy truncate">Revision {rev.revisionNumber}</p>
                            {status === 'pending' && <AlertCircle className="w-3.5 h-3.5 text-rejected shrink-0" />}
                            {status === 'approved' && <span className="text-[10px] font-semibold text-approved shrink-0">Approved</span>}
                            {status === 'rejected' && <span className="text-[10px] font-semibold text-rejected shrink-0">Denied</span>}
                          </div>
                          <p className="text-xs text-slate-blue-gray truncate">{rev.name} &middot; {formatDate(rev.createdAt)}</p>
                        </div>
                        <button
                          onClick={() => setRequestingFor(rev)}
                          className="text-xs font-medium text-steel-blue hover:underline shrink-0"
                        >
                          Request Approval
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Upload new revision */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full mt-4 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-ice-blue rounded-xl text-sm font-medium text-steel-blue hover:bg-frost-white transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Uploading...' : 'Upload New Revision'}
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} accept="*/*" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
