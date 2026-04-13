'use client';

import { useState, useEffect } from 'react';
import { X, Search, FileCheck, GitBranch, Loader2 } from 'lucide-react';
import { getProjectMembers, type ProjectMember } from '@/lib/inbox';
import { useApprovalStore } from '@/stores/approvalStore';
import { useProjectStore, type ProjectDocument } from '@/stores/projectStore';

interface ApprovalModalProps {
  open: boolean;
  onClose: () => void;
  document: ProjectDocument;
  projectId: string;
}

type View = 'choose' | 'request' | 'revision-confirm';

export default function ApprovalModal({ open, onClose, document: doc, projectId }: ApprovalModalProps) {
  const [view, setView] = useState<View>('choose');
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const requestApproval = useApprovalStore((s) => s.requestApproval);
  const convertToRevisionGroup = useProjectStore((s) => s.convertToRevisionGroup);

  useEffect(() => {
    if (open) {
      setView('choose');
      setSearch('');
      setSelectedMember(null);
      getProjectMembers(projectId).then(setMembers);
    }
  }, [open, projectId]);

  if (!open) return null;

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleRequestApproval = async () => {
    if (!selectedMember) return;
    setSubmitting(true);
    await requestApproval({
      documentId: doc.id,
      projectId,
      approverId: selectedMember.userId,
    });
    setSubmitting(false);
    onClose();
  };

  const handleCreateRevision = async () => {
    setSubmitting(true);
    await convertToRevisionGroup(doc.id);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="modal-container rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-light-gray dark:border-white/10">
          <h3 className="text-base font-semibold text-dark-navy">
            {view === 'choose' && 'Approvals'}
            {view === 'request' && 'Request Approval'}
            {view === 'revision-confirm' && 'Create Revision'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-frost-white dark:hover:bg-white/5 text-slate-blue-gray">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {/* File info */}
          <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-frost-white dark:bg-white/5">
            <FileCheck className="w-4 h-4 text-steel-blue shrink-0" />
            <span className="text-sm text-dark-navy font-medium truncate">{doc.name}</span>
          </div>

          {/* Choose view */}
          {view === 'choose' && (
            <div className="space-y-3">
              <button
                onClick={() => setView('request')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-light-gray dark:border-white/10 hover:bg-frost-white dark:hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-steel-blue/10 flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-steel-blue" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-dark-navy">Request Approval</p>
                  <p className="text-xs text-slate-blue-gray mt-0.5">Send this file for approval to a project member</p>
                </div>
              </button>

              {!doc.isRevisionGroup && (
                <button
                  onClick={() => setView('revision-confirm')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-light-gray dark:border-white/10 hover:bg-frost-white dark:hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-steel-blue/10 flex items-center justify-center">
                    <GitBranch className="w-5 h-5 text-steel-blue" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-dark-navy">Create Revision</p>
                    <p className="text-xs text-slate-blue-gray mt-0.5">Convert this file into a revision group for version tracking</p>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* Request Approval view */}
          {view === 'request' && (
            <div>
              <p className="text-sm text-slate-blue-gray mb-3">Select who should approve this file:</p>

              {/* Search */}
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

              {/* Member list */}
              <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
                {filtered.length === 0 ? (
                  <p className="text-sm text-slate-blue-gray text-center py-4">No members found</p>
                ) : (
                  filtered.map((m) => (
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
                  ))
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setView('choose')} className="flex-1 px-4 py-2.5 rounded-xl border border-light-gray dark:border-white/10 text-sm font-medium text-dark-navy hover:bg-frost-white dark:hover:bg-white/5 transition-colors">
                  Back
                </button>
                <button
                  onClick={handleRequestApproval}
                  disabled={!selectedMember || submitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-steel-blue text-white text-sm font-medium hover:bg-dark-navy transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Request
                </button>
              </div>
            </div>
          )}

          {/* Create Revision confirm */}
          {view === 'revision-confirm' && (
            <div>
              <p className="text-sm text-dark-navy mb-2">
                This will convert <strong>&ldquo;{doc.name}&rdquo;</strong> into a revision group.
              </p>
              <ul className="text-xs text-slate-blue-gray space-y-1 mb-5 ml-4 list-disc">
                <li>The file extension will be removed from the name</li>
                <li>The original file becomes Revision 1</li>
                <li>You can upload new revisions and request approvals for each</li>
              </ul>

              <div className="flex gap-3">
                <button onClick={() => setView('choose')} className="flex-1 px-4 py-2.5 rounded-xl border border-light-gray dark:border-white/10 text-sm font-medium text-dark-navy hover:bg-frost-white dark:hover:bg-white/5 transition-colors">
                  Back
                </button>
                <button
                  onClick={handleCreateRevision}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-steel-blue text-white text-sm font-medium hover:bg-dark-navy transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Revision
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
