'use client';

import { useMemo, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createOrganization } from '@/lib/platform';
import { statusLabel } from '@/lib/orgStatus';
import type { OrgStatus } from '@/types/admin';

interface CreateOrgModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const STATUSES: OrgStatus[] = ['trial', 'active', 'past_due', 'suspended', 'cancelled', 'purged'];

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function CreateOrgModal({ open, onClose, onCreated }: CreateOrgModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [licenses, setLicenses] = useState('5');
  const [status, setStatus] = useState<OrgStatus>('trial');
  const [contactEmail, setContactEmail] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveSlug = useMemo(
    () => (slugTouched ? slugify(slug) : slugify(name)),
    [slug, slugTouched, name],
  );

  function reset() {
    setName(''); setSlug(''); setSlugTouched(false); setLicenses('5');
    setStatus('trial'); setContactEmail(''); setOwnerEmail('');
    setError(null); setSubmitting(false);
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!name.trim()) { setError('Organization name is required.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await createOrganization({
        name: name.trim(),
        slug: effectiveSlug || undefined,
        licenses: licenses ? Math.max(0, Number(licenses)) : 0,
        status,
        primaryContactEmail: contactEmail || undefined,
        ownerEmail: ownerEmail || undefined,
      });
      reset();
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create organization.');
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="modal-container rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-light-gray dark:border-white/6">
          <h2 className="text-lg font-semibold text-dark-navy dark:text-frost-white">New organization</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-frost-white dark:hover:bg-white/5 text-slate-blue-gray"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-blue-gray mb-1 block">
              Name <span className="text-rejected">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field w-full"
              placeholder="Acme Construction Co."
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Slug</label>
            <input
              type="text"
              value={slugTouched ? slug : effectiveSlug}
              onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
              className="input-field w-full font-mono text-sm"
              placeholder="acme-construction-co"
            />
            <p className="text-[11px] text-slate-blue-gray mt-1">
              Auto-generated from the name. Must be unique.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Licenses</label>
              <input
                type="number"
                min={0}
                value={licenses}
                onChange={(e) => setLicenses(e.target.value)}
                className="input-field w-full"
                placeholder="0"
              />
              <p className="text-[11px] text-slate-blue-gray mt-1">Licensed seats.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrgStatus)}
                className="input-field appearance-none w-full"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{statusLabel(s)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-blue-gray mb-1 block">
              Primary contact email
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="input-field w-full"
              placeholder="ops@acme.com (optional)"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Owner email</label>
            <input
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              className="input-field w-full"
              placeholder="owner@acme.com (optional)"
            />
            <p className="text-[11px] text-slate-blue-gray mt-1">
              If this matches an existing user, they&apos;re added as the org owner (licensed seat).
            </p>
          </div>

          <p className="text-[11px] text-slate-blue-gray">Plan: <span className="font-semibold text-dark-navy dark:text-frost-white">C1.0</span></p>

          {error && (
            <div className="text-sm text-rejected bg-rejected/10 border border-rejected/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-light-gray dark:border-white/6">
          <button onClick={handleClose} className="btn-secondary" disabled={submitting}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary flex items-center gap-2"
            disabled={submitting || !name.trim()}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Create organization
          </button>
        </div>
      </div>
    </div>
  );
}
