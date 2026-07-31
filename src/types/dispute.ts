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
