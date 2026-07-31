# Dispute Package Builder — Architecture Decisions

Evidence tooling for construction disputes: describe a dispute + date range → a
ranked, cited, downloadable evidence package. Handed to attorneys/arbitrators, so
**reproducibility, provenance, and immutability outrank cleverness.** Web-only.

Adapts the spec (`dispute-builder-prompt.md`) to Construxa's stack: Next.js SPA +
Supabase (Postgres, RLS, Edge Functions), Google Vision OCR, Claude via the
`ask-claude` edge function. No job queue, no object storage beyond Supabase
Storage, no embeddings vendor.

## Non-negotiable decisions

### Extraction happens at INGEST, never at dispute time (§2.1)
OCR'ing a two-year project on every dispute is a 40-minute job and a large bill
each time. Instead, every uploaded file runs a one-time extraction pipeline:

- On upload → `extract-document` edge function: hash the bytes, extract text,
  store per-page text + bounding boxes.
- **Cached by content hash (SHA-256)**, not document id. The same drawing
  uploaded to three projects is OCR'd once; `documents.content_hash` points at
  the shared `document_extractions` row.
- The dispute builder is a **consumer** of this index. It only extracts the small
  set of not-yet-processed files, surfaced as a progress step.

### Retrieval funnel: keyword + Haiku (adapted §2.4)
You cannot fit thousands of documents in any Claude context window (a size limit,
not a cost one), so retrieval is a funnel:

| Stage | Method | In → Out |
| --- | --- | --- |
| Filter | SQL — project, date, type, permission | corpus → thousands |
| Recall | **Postgres full-text search** (tsvector over OCR text) | thousands → ~300 |
| Rerank | **Claude Haiku**, batched, structured scoring | ~300 → ~40 |
| Synthesize | Larger Claude, full text of the top set | ~40 → narrative + citations |

**No embeddings/vector recall for now.** Anthropic serves no embeddings endpoint;
rather than add Voyage/OpenAI, we use Postgres FTS — which is exactly what nails
the exact identifiers disputes turn on (RFI/PO numbers, spec sections). Semantic
recall can be layered on later (pgvector + a provider) without reworking the
funnel. Extract dispute identifiers with a cheap Claude call and inject them as
high-weight exact-match terms.

### "The date" (§2.3)
Documents have several candidate dates that disagree. A `governing_date` resolver
per type will be defined when the retrieval layer lands (Phase 2). Today the
`documents` table effectively has `created_at`; richer per-type dates
(`event_date`, `effective_date`) come with the domain modules.

## OCR engine

Google **Vision `DOCUMENT_TEXT_DETECTION`** (service-account auth, see
`ocr-document`). Vision returns per-page text **and** per-block bounding boxes +
confidence — so citations can point to a page and a region without extra work.

Native-text extraction (skip OCR when a PDF already has a text layer) is a
documented cost optimization, **deferred**: it needs a PDF text parser in the
function. Because extraction is content-hash-cached, each unique file is only
ever processed once, so this optimization is about first-ingest cost, not repeat
cost.

## Data model (Phase 1)

```
document_extractions            -- shared, keyed by content hash
  content_hash (pk), page_count, text_by_page (jsonb), full_text (text),
  ocr_engine, ocr_confidence, language, extracted_at

documents
  + content_hash                -- FK-less pointer into document_extractions
```

`text_by_page` shape: `[{ page, text, blocks: [{ text, bbox: [x0,y0,x1,y1] }] }]`
(bbox in Vision's normalized/pixel vertices). `full_text` is the flattened
concatenation, mirrored into `documents.ocr_text` to feed the existing FTS
`tsvector`.

`document_extractions` has RLS enabled with **no client policies** — it is
written by the service-role edge function and read server-side only. Documents
themselves remain RLS-scoped as today, so per-document permissions are unchanged.

Later phases add `disputes`, `dispute_runs` (append-only), `dispute_documents`,
`dispute_narratives`, `dispute_exports` per spec §3.

## What Phase 1 delivers (this pass)

- `document_extractions` table + `documents.content_hash` + migration.
- `extract-document` edge function (hash → cache → Vision per-page+bbox → upsert).
- Ingest hook: every upload triggers extraction (replaces folder-flagged auto-OCR).
- A client-driven batched **backfill** for existing documents.

## Deferred (later phases / need infra)

Embeddings + pgvector; job queue (using edge functions + client batching);
object-storage ZIP streaming; Bates stamping; privilege screening; immutable
`dispute_runs`; load-file (Concordance/CSV) export; entitlement gating
(entitlements deferred platform-wide). Legal-defensibility requirements (§5)
land with the export phase.
