// Dispute Builder — retrieval (Phase 2).
// Extract exact identifiers from the dispute description and inject them as
// high-weight terms, then run the dispute_candidates resolver (SQL filter +
// keyword/FTS recall). Reranking (Haiku) and synthesis come in later phases.

import { getSupabaseClient } from './supabase';
import type { DisputeCandidate, InclusionReason } from '@/types/dispute';

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
