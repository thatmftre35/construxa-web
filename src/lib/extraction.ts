// Backfill helper for the ingest extraction pipeline. Extracts existing
// documents that predate the pipeline (no content_hash yet). Sequential to stay
// gentle on Vision quota; each unique file is only processed once (hash cache).

import { getSupabaseClient } from './supabase';
import { isOcrable } from '@/stores/projectStore';

export async function fetchDocsNeedingExtraction(
  projectId: string,
): Promise<{ id: string; name: string; type: string }[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('documents')
    .select('id, name, type')
    .eq('project_id', projectId)
    .is('content_hash', null);
  if (error) throw new Error(error.message);
  return ((data ?? []) as { id: string; name: string; type: string }[]).filter((d) => isOcrable(d.type));
}

export async function extractOne(documentId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('extract-document', {
    body: { documentId },
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
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
}

export interface BackfillProgress {
  done: number;
  total: number;
  failed: number;
  current?: string;
}

/** Extract every un-extracted document in a project, reporting progress. */
export async function backfillProjectExtractions(
  projectId: string,
  onProgress?: (p: BackfillProgress) => void,
): Promise<{ done: number; failed: number; total: number }> {
  const docs = await fetchDocsNeedingExtraction(projectId);
  let done = 0;
  let failed = 0;
  for (const d of docs) {
    onProgress?.({ done, total: docs.length, failed, current: d.name });
    try {
      await extractOne(d.id);
    } catch {
      failed++;
    }
    done++;
  }
  onProgress?.({ done, total: docs.length, failed });
  return { done, failed, total: docs.length };
}
