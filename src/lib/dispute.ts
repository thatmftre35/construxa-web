// Dispute Builder — retrieval (Phase 2).
// Extract exact identifiers from the dispute description and inject them as
// high-weight terms, then run the dispute_candidates resolver (SQL filter +
// keyword/FTS recall). Reranking (Haiku) and synthesis come in later phases.

import JSZip from 'jszip';
import { getSupabaseClient } from './supabase';
import {
  rowToDispute,
  type DisputeCandidate, type InclusionReason,
  type RankedDocument, type SupportsPosition, type Dispute, type DisputeRow,
} from '@/types/dispute';

const RERANK_MODEL = 'claude-haiku-4-5-20251001';
const SYNTH_MODEL = 'claude-opus-4-7';
const MAX_RERANK = 60;          // cap candidates sent to Claude (token discipline)
const RERANK_BATCH = 20;
const SNIPPET_CHARS = 600;

// Common construction identifiers disputes turn on: RFI/CO/COR/submittal/PO/ASI
// numbers, CSI MasterFormat spec sections, and drawing numbers.
const IDENTIFIER_PATTERNS: RegExp[] = [
  /\bRFI[-\s#]*\d+\b/gi,
  /\b(?:CO|COR|CCD|PCO|CPR)[-\s#]*\d+\b/gi,
  /\bSUB(?:MITTAL)?[-\s#]*\d+\b/gi,
  /\bPO[-\s#]*\d+\b/gi,
  /\bASI[-\s#]*\d+\b/gi,
  /\b\d{2}\s?\d{2}\s?\d{2}(?:\.\d+)?\b/g, // CSI MasterFormat, e.g. 03 30 00
  /\b[A-Z]{1,2}-?\d{2,4}[A-Z]?\b/g,       // drawing numbers, e.g. A-101, S200
];

export function extractIdentifiers(text: string): string[] {
  const out = new Set<string>();
  for (const re of IDENTIFIER_PATTERNS) {
    const matches = text.match(re);
    if (matches) for (const m of matches) out.add(m.trim());
  }
  return Array.from(out);
}

export interface FindCandidatesInput {
  projectId: string;
  start: string; // ISO
  end: string;   // ISO
  description: string;
}

interface CandidateRow {
  document_id: string;
  name: string;
  type: string;
  folder: string;
  governing_date: string;
  in_window: boolean;
  keyword_hit: boolean;
  inclusion_reason: InclusionReason;
  rank: number;
  snippet: string;
}

export async function findDisputeCandidates(input: FindCandidatesInput): Promise<DisputeCandidate[]> {
  const supabase = getSupabaseClient();
  const keywords = extractIdentifiers(input.description);
  const { data, error } = await supabase.rpc('dispute_candidates', {
    p_project: input.projectId,
    p_start: input.start,
    p_end: input.end,
    p_query: input.description,
    p_keywords: keywords,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as CandidateRow[]).map((r) => ({
    documentId: r.document_id,
    name: r.name,
    type: r.type,
    folder: r.folder,
    governingDate: r.governing_date,
    inWindow: r.in_window,
    keywordHit: r.keyword_hit,
    inclusionReason: r.inclusion_reason,
    rank: r.rank,
    snippet: r.snippet,
  }));
}

// ---- Claude via ask-claude (with model/system overrides) ----
async function callClaude(prompt: string, system: string, model: string): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('ask-claude', {
    body: {
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      system, model, thinking: false, max_tokens: 4000,
    },
  });
  if (error) {
    let detail = error.message;
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.text === 'function') {
      try {
        const raw = await ctx.text();
        const parsed = raw ? JSON.parse(raw) : null;
        detail = (parsed as { error?: string })?.error || raw || detail;
      } catch { /* keep generic */ }
    }
    throw new Error(detail);
  }
  const a = data as { answer?: string; error?: string };
  if (a?.error) throw new Error(a.error);
  return a?.answer ?? '';
}

const RERANK_SYSTEM = `You are a construction-dispute analyst ranking documents for relevance to a described dispute.
For EACH document return a JSON object with:
- "document_id": the id given
- "relevance_score": integer 0-100 (how relevant to the described dispute)
- "rationale": one sentence on why it matters
- "supports_position": one of "claimant" (helps the party raising the dispute), "respondent" (adverse — helps the other side), "neutral", or "unclear"
CRITICAL: surface ADVERSE documents (supports_position "respondent") with equal weight — a package that only contains helpful documents is worthless preparation. Do not omit or downweight adverse evidence.
Return ONLY a JSON array of these objects, no prose, no markdown fences.`;

function parseJsonArray(text: string): unknown[] {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('[');
  const end = t.lastIndexOf(']');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  try { return JSON.parse(t) as unknown[]; } catch { return []; }
}

async function rerankBatch(
  description: string, batch: DisputeCandidate[],
): Promise<Map<string, { score: number; rationale: string; supports: SupportsPosition }>> {
  const docList = batch.map((c) => ({
    document_id: c.documentId,
    name: c.name,
    type: c.type,
    date: c.governingDate?.slice(0, 10),
    excerpt: (c.snippet || '').replace(/<<|>>/g, '').slice(0, SNIPPET_CHARS),
  }));
  const prompt = `DISPUTE DESCRIPTION:\n${description}\n\nDOCUMENTS:\n${JSON.stringify(docList, null, 2)}`;
  const answer = await callClaude(prompt, RERANK_SYSTEM, RERANK_MODEL);
  const out = new Map<string, { score: number; rationale: string; supports: SupportsPosition }>();
  for (const item of parseJsonArray(answer)) {
    const o = item as { document_id?: string; relevance_score?: number; rationale?: string; supports_position?: string };
    if (!o?.document_id) continue;
    const supports = (['claimant', 'respondent', 'neutral', 'unclear'].includes(o.supports_position || '')
      ? o.supports_position : 'unclear') as SupportsPosition;
    out.set(o.document_id, {
      score: Math.max(0, Math.min(100, Math.round(Number(o.relevance_score) || 0))),
      rationale: String(o.rationale || ''),
      supports,
    });
  }
  return out;
}

export interface AnalyzeInput extends FindCandidatesInput { onProgress?: (msg: string) => void }

export interface AnalyzeResult {
  candidates: DisputeCandidate[];
  ranked: RankedDocument[];
}

/** Resolver -> Haiku rerank. Returns docs ranked by relevance to the description. */
export async function analyzeDispute(input: AnalyzeInput): Promise<AnalyzeResult> {
  input.onProgress?.('Collecting documents…');
  const candidates = await findDisputeCandidates(input);

  input.onProgress?.(`Ranking ${Math.min(candidates.length, MAX_RERANK)} of ${candidates.length} candidates…`);
  const toRerank = candidates.slice(0, MAX_RERANK);
  const scores = new Map<string, { score: number; rationale: string; supports: SupportsPosition }>();
  for (let i = 0; i < toRerank.length; i += RERANK_BATCH) {
    const batch = toRerank.slice(i, i + RERANK_BATCH);
    try {
      const res = await rerankBatch(input.description, batch);
      res.forEach((v, k) => scores.set(k, v));
    } catch { /* batch failure is non-fatal; those docs fall back to unscored */ }
    input.onProgress?.(`Ranked ${Math.min(i + RERANK_BATCH, toRerank.length)}/${toRerank.length}…`);
  }

  const ranked: RankedDocument[] = candidates.map((c) => {
    const s = scores.get(c.documentId);
    const relevanceScore = s ? s.score : 0;
    return {
      ...c,
      relevanceScore,
      rationale: s?.rationale ?? '',
      supportsPosition: s?.supports ?? 'unclear',
      scored: !!s,
      included: c.inWindow || relevanceScore >= 40,
    };
  }).sort((a, b) =>
    (b.scored ? 1 : 0) - (a.scored ? 1 : 0) ||
    b.relevanceScore - a.relevanceScore ||
    (b.inWindow ? 1 : 0) - (a.inWindow ? 1 : 0),
  );

  return { candidates, ranked };
}

// ---- Persistence ----
export async function createDispute(input: {
  projectId: string; title: string; description: string; start: string; end: string;
}): Promise<Dispute> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('disputes').insert({
    project_id: input.projectId,
    title: input.title || 'Untitled dispute',
    description: input.description,
    date_range_start: input.start,
    date_range_end: input.end,
    status: 'analyzing',
    created_by: user.id,
  }).select().single();
  if (error) throw new Error(error.message);
  return rowToDispute(data as DisputeRow);
}

export async function fetchDisputes(projectId: string): Promise<Dispute[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('disputes')
    .select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as DisputeRow[]).map(rowToDispute);
}

export async function saveDisputeRun(disputeId: string, run: {
  params: Record<string, unknown>; ranked: RankedDocument[]; corpusSize: number;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { count } = await supabase.from('dispute_runs')
    .select('id', { count: 'exact', head: true }).eq('dispute_id', disputeId);
  const included = run.ranked.filter((r) => r.included);
  const { error } = await supabase.from('dispute_runs').insert({
    dispute_id: disputeId,
    run_number: (count ?? 0) + 1,
    params_snapshot: run.params,
    model_versions: { rerank: RERANK_MODEL, synthesis: SYNTH_MODEL },
    results: run.ranked,
    corpus_size: run.corpusSize,
    candidates_scored: run.ranked.filter((r) => r.scored).length,
    documents_selected: included.length,
    status: 'ready',
    completed_at: new Date().toISOString(),
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  await supabase.from('disputes').update({ status: 'ready', updated_at: new Date().toISOString() }).eq('id', disputeId);
}

// ---- ZIP export ----
function sanitize(name: string): string {
  return name.replace(/[^a-z0-9._-]+/gi, '_').replace(/_+/g, '_').slice(0, 120);
}

/** Build a downloadable ZIP of the included documents + README + manifest. */
export async function buildDisputeZip(
  meta: { title: string; description: string; start: string; end: string; projectName: string },
  included: RankedDocument[],
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const supabase = getSupabaseClient();
  const ids = included.map((d) => d.documentId);
  const pathById = new Map<string, { path: string | null; name: string }>();
  if (ids.length) {
    const { data } = await supabase.from('documents').select('id, storage_path, name').in('id', ids);
    for (const d of (data ?? []) as { id: string; storage_path: string | null; name: string }[]) {
      pathById.set(d.id, { path: d.storage_path, name: d.name });
    }
  }

  const zip = new JSZip();
  const root = zip.folder(`DisputePackage_${sanitize(meta.title || 'dispute')}`)!;

  root.file('00_README.txt',
    `DISPUTE PACKAGE\n===============\n\n` +
    `Project: ${meta.projectName}\nTitle: ${meta.title}\n` +
    `Date range: ${meta.start.slice(0, 10)} to ${meta.end.slice(0, 10)}\n` +
    `Generated: ${new Date().toISOString()}\n\n` +
    `DESCRIPTION\n${meta.description}\n\n` +
    `METHODOLOGY\nDocuments were retrieved by date range and full-text/keyword search, then ` +
    `relevance-ranked with an AI model (Claude Haiku). This is AI-ASSISTED document assembly, ` +
    `NOT legal advice, and requires attorney review. Relevance ranking is a drafting aid; a human ` +
    `reviewed and selected the included set.\n`);

  const header = 'bates,name,type,governing_date,inclusion_reason,relevance_score,supports_position,rationale\n';
  const rows = included.map((d, i) => [
    `PKG-${String(i + 1).padStart(5, '0')}`,
    csv(d.name), csv(d.type), (d.governingDate || '').slice(0, 10),
    d.inclusionReason, String(d.relevanceScore), d.supportsPosition, csv(d.rationale),
  ].join(','));
  root.file('00_MANIFEST.csv', header + rows.join('\n'));

  const files = root.folder('FILES')!;
  let done = 0;
  for (const d of included) {
    const info = pathById.get(d.documentId);
    onProgress?.(done, included.length);
    if (info?.path) {
      try {
        const { data: signed } = await supabase.storage.from('documents').createSignedUrl(info.path, 3600);
        if (signed?.signedUrl) {
          const resp = await fetch(signed.signedUrl);
          if (resp.ok) {
            const buf = await resp.arrayBuffer();
            files.file(`${(d.governingDate || '').slice(0, 10)}_${sanitize(info.name)}`, buf);
          }
        }
      } catch { /* skip unreadable file; it just won't be in the zip */ }
    }
    done++;
  }
  onProgress?.(done, included.length);
  return zip.generateAsync({ type: 'blob' });
}

function csv(s: string): string {
  const v = (s || '').replace(/"/g, '""');
  return /[",\n]/.test(v) ? `"${v}"` : v;
}
