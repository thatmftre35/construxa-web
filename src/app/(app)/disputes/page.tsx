'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Scale, Loader2, Download, FileText } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import {
  analyzeDispute, createDispute, saveDisputeRun, buildDisputeZip,
} from '@/lib/dispute';
import type { RankedDocument, SupportsPosition } from '@/types/dispute';

export default function DisputesPage() {
  const projects = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);

  const [projectId, setProjectId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [description, setDescription] = useState('');

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ranked, setRanked] = useState<RankedDocument[] | null>(null);
  const [zipping, setZipping] = useState<string | null>(null);

  useEffect(() => { if (projects.length === 0) fetchProjects().catch(() => {}); }, [projects.length, fetchProjects]);
  useEffect(() => { if (!projectId && projects[0]) setProjectId(projects[0].id); }, [projects, projectId]);

  const selectedProject = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);
  const includedCount = ranked?.filter((r) => r.included).length ?? 0;
  const canRun = projectId && start && end && description.trim().length > 10 && !running;

  async function run() {
    if (!canRun) return;
    setRunning(true); setError(null); setRanked(null); setProgress('Starting…');
    const startISO = `${start}T00:00:00.000Z`;
    const endISO = `${end}T23:59:59.999Z`;
    try {
      const dispute = await createDispute({
        projectId, title: description.trim().split('\n')[0].slice(0, 80),
        description, start: startISO, end: endISO,
      });
      const result = await analyzeDispute({
        projectId, start: startISO, end: endISO, description, onProgress: setProgress,
      });
      setProgress('Saving run…');
      await saveDisputeRun(dispute.id, {
        params: { start: startISO, end: endISO, description, projectId },
        ranked: result.ranked, corpusSize: result.candidates.length,
      });
      setRanked(result.ranked);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed.');
    } finally {
      setRunning(false); setProgress('');
    }
  }

  function toggle(id: string) {
    setRanked((prev) => prev?.map((r) => r.documentId === id ? { ...r, included: !r.included } : r) ?? prev);
  }

  async function download() {
    if (!ranked) return;
    const included = ranked.filter((r) => r.included);
    if (included.length === 0) { setError('Select at least one document to include.'); return; }
    setZipping('Preparing…'); setError(null);
    try {
      const blob = await buildDisputeZip(
        { title: description.trim().split('\n')[0].slice(0, 80), description, start: `${start}T00:00:00Z`, end: `${end}T00:00:00Z`, projectName: selectedProject?.name ?? '' },
        included,
        (done, total) => setZipping(`Packaging ${done}/${total}…`),
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DisputePackage_${(selectedProject?.name ?? 'project').replace(/[^a-z0-9]+/gi, '_')}_${start}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build the ZIP.');
    } finally {
      setZipping(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="flex items-center gap-2">
        <Scale size={24} className="text-steel-blue dark:text-ice-blue" />
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-navy dark:text-frost-white">Dispute Package Builder</h1>
      </div>
      <p className="text-sm text-slate-blue-gray -mt-2">
        Describe a dispute and a date range. Construxa collects the project records, ranks them for
        relevance with AI, and builds a downloadable evidence package. AI-assisted — requires attorney review.
      </p>

      {/* Form */}
      <div className="card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input-field appearance-none w-full">
              {projects.length === 0 && <option value="">No projects</option>}
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-blue-gray mb-1 block">From</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="input-field w-full" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-blue-gray mb-1 block">To</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="input-field w-full" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Describe the dispute</label>
          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)} rows={5}
            className="input-field w-full"
            placeholder="e.g. The March slab pour was delayed because the rebar inspection failed twice. We issued RFI 042 and CO 015 covering the standby costs. Describe what happened, who's involved, and any RFI/CO/PO/spec numbers."
          />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={run} disabled={!canRun} className="btn-primary flex items-center gap-2">
            {running ? <Loader2 size={16} className="animate-spin" /> : <Scale size={16} />}
            Build package
          </button>
          {running && <span className="text-sm text-slate-blue-gray">{progress}</span>}
        </div>
        {error && <div className="text-sm text-rejected bg-rejected/10 border border-rejected/20 rounded-lg px-3 py-2">{error}</div>}
      </div>

      {/* Results */}
      {ranked && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-slate-blue-gray">
              {ranked.length} candidates · {ranked.filter((r) => r.inWindow).length} in-window ·
              {' '}{ranked.filter((r) => r.scored).length} AI-ranked · <span className="text-dark-navy dark:text-frost-white font-semibold">{includedCount} selected</span>
            </div>
            <button onClick={download} disabled={!!zipping || includedCount === 0} className="btn-primary flex items-center gap-2">
              {zipping ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {zipping ?? 'Download ZIP'}
            </button>
          </div>

          {ranked.length === 0 ? (
            <div className="card text-center text-slate-blue-gray py-10">
              <FileText size={28} className="mx-auto mb-2" />
              No documents matched. Widen the date range, or make sure the project&apos;s files have been extracted.
            </div>
          ) : (
            <div className="space-y-2">
              {ranked.map((d) => (
                <label key={d.documentId} className="card flex items-start gap-3 cursor-pointer hover:shadow-md transition-shadow">
                  <input type="checkbox" checked={d.included} onChange={() => toggle(d.documentId)} className="mt-1 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-dark-navy dark:text-frost-white truncate">{d.name}</span>
                      {d.scored && <span className="text-xs font-bold text-steel-blue dark:text-ice-blue">{d.relevanceScore}</span>}
                      <PositionBadge position={d.supportsPosition} scored={d.scored} />
                      <ReasonBadge reason={d.inclusionReason} />
                    </div>
                    {d.rationale && <p className="text-sm text-slate-blue-gray mt-0.5">{d.rationale}</p>}
                    {d.snippet && (
                      <p className="text-xs text-slate-blue-gray/80 mt-1"
                         dangerouslySetInnerHTML={{ __html: d.snippet.replace(/</g, '&lt;').replace(/&lt;&lt;/g, '<mark>').replace(/&gt;&gt;/g, '</mark>') }} />
                    )}
                    <p className="text-[11px] text-slate-blue-gray mt-1">
                      {(d.governingDate || '').slice(0, 10)} · {d.type || 'file'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function PositionBadge({ position, scored }: { position: SupportsPosition; scored: boolean }) {
  if (!scored) return null;
  const map: Record<SupportsPosition, { label: string; cls: string }> = {
    claimant: { label: 'Supports', cls: 'badge-active' },
    respondent: { label: 'Adverse', cls: 'badge-overdue' },
    neutral: { label: 'Neutral', cls: 'bg-light-gray text-slate-blue-gray' },
    unclear: { label: 'Unclear', cls: 'bg-light-gray text-slate-blue-gray' },
  };
  const m = map[position];
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

function ReasonBadge({ reason }: { reason: string }) {
  const label = reason === 'in_window' ? 'In window' : reason === 'keyword_match' ? 'Identifier' : 'Text match';
  return <span className="badge bg-light-gray text-slate-blue-gray">{label}</span>;
}
