// Dispute Builder domain types.

export type InclusionReason = 'in_window' | 'keyword_match' | 'text_match';

export interface DisputeCandidate {
  documentId: string;
  name: string;
  type: string;
  folder: string;
  governingDate: string;
  inWindow: boolean;
  keywordHit: boolean;
  inclusionReason: InclusionReason;
  rank: number;
  snippet: string;
}

export type SupportsPosition = 'claimant' | 'respondent' | 'neutral' | 'unclear';

// A candidate after Claude reranking.
export interface RankedDocument extends DisputeCandidate {
  relevanceScore: number;        // 0-100 (Claude) or resolver-derived fallback
  rationale: string;
  supportsPosition: SupportsPosition;
  scored: boolean;               // false = included by window but not Claude-scored
  included: boolean;             // user include/exclude for export
}

export type DisputeStatus = 'draft' | 'analyzing' | 'ready' | 'failed' | 'archived';

export interface Dispute {
  id: string;
  projectId: string;
  title: string;
  description: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  status: DisputeStatus;
  createdAt: string;
}

export interface DisputeRow {
  id: string;
  project_id: string;
  title: string;
  description: string;
  date_range_start: string;
  date_range_end: string;
  status: DisputeStatus;
  created_at: string;
}

export function rowToDispute(r: DisputeRow): Dispute {
  return {
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    description: r.description,
    dateRangeStart: r.date_range_start,
    dateRangeEnd: r.date_range_end,
    status: r.status,
    createdAt: r.created_at,
  };
}
