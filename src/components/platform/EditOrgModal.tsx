'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { updateOrganization } from '@/lib/platform';
import type { Organization } from '@/types/admin';

interface EditOrgModalProps {
  org: Organization;
  onClose: () => void;
  onSaved: () => void;
}

// Single plan for now.
const PLANS = ['C1.0'];

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function EditOrgModal({ org, onClose, onSaved }: EditOrgModalProps) {
  const [name, setName] = useState(org.name);
  const [slug, setSlug] = useState(org.slug);
  const [plan, setPlan] = useState(org.plan || 'C1.0');
  const [contactEmail, setContactEmail] = useState(org.primaryContactEmail ?? '');
  const [volumeTier, setVolumeTier] = useState(org.volumeTier ?? '');
  const [licenses, setLicenses] = useState(String(org.maxLicensedSeats));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) { setError('Organization name is required.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await updateOrganization(org.id, {
        name: name.trim(),
        slug: slugify(slug) || slugify(name),
        plan,
        primaryContactEmail: contactEmail.trim(),
        volumeTier: volumeTier.trim(),
        licenses: licenses ? Math.max(0, Number(licenses)) : 0,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save changes.');
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={submitting ? undefined : onClose}
    >
      <div
        className="modal-container rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-light-gray dark:border-white/6">
          <h2 className="text-lg font-semibold text-dark-navy dark:text-frost-white">Edit organization</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-frost-white dark:hover:bg-white/5 text-slate-blue-gray"
            disabled={submitting}
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
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="input-field w-full font-mono text-sm"
            />
            <p className="text-[11px] text-slate-blue-gray mt-1">Must be unique.</p>
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
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="input-field appearance-none w-full"
              >
                {PLANS.map((p) => (
                  <option key={p} value={p}>{p}</option>
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
              placeholder="ops@acme.com"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-blue-gray mb-1 block">Volume tier</label>
            <input
              type="text"
              value={volumeTier}
              onChange={(e) => setVolumeTier(e.target.value)}
              className="input-field w-full"
              placeholder="Annual construction volume tier (optional)"
            />
          </div>

          <p className="text-[11px] text-slate-blue-gray">
            Status is managed with the lifecycle actions on the org page.
          </p>

          {error && (
            <div className="text-sm text-rejected bg-rejected/10 border border-rejected/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-light-gray dark:border-white/6">
          <button onClick={onClose} className="btn-secondary" disabled={submitting}>Cancel</button>
          <button onClick={handleSave} className="btn-primary flex items-center gap-2" disabled={submitting || !name.trim()}>
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
